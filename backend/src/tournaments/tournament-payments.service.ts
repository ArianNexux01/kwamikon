import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TournamentEntry, TournamentPayment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VeroClient, VeroTransaction } from '../payments/vero.client';
import {
  FAILED_STATUSES,
  PAYMENT_WINDOW_MS,
  SWEEP_INTERVAL_MS,
  SYNC_THROTTLE_MS,
  maskEmail,
  normalizePhone,
} from '../payments/payment-rules';
import { TournamentsService } from './tournaments.service';
import { CreateEntryPaymentDto } from './dto/create-entry-payment.dto';

const CANCELLED_MESSAGE =
  'Esta inscrição foi cancelada porque o pagamento não foi concluído. Faz uma nova inscrição.';

/**
 * Pagamento das inscrições nos torneios pela Vero Pays. Segue as mesmas regras dos
 * bilhetes (ver PaymentsService): prazo de 5 minutos, reaproveitamento da cobrança
 * pendente, confirmação sempre verificada na API e pagamentos tardios aceites.
 */
@Injectable()
export class TournamentPaymentsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TournamentPaymentsService.name);
  private sweepTimer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vero: VeroClient,
    private readonly tournaments: TournamentsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.sweepTimer = setInterval(
      () => void this.cancelOverdue(),
      SWEEP_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }

  async cancelOverdue() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const overdue = await this.prisma.tournamentEntry.findMany({
        where: {
          status: 'PENDENTE',
          createdAt: { lt: new Date(Date.now() - PAYMENT_WINDOW_MS) },
        },
        select: { id: true },
      });
      for (const { id } of overdue) {
        await this.expire(id);
      }
    } catch (err) {
      this.logger.error(
        `Falha ao cancelar inscrições fora de prazo: ${(err as Error).message}`,
      );
    } finally {
      this.sweeping = false;
    }
  }

  async create(dto: CreateEntryPaymentDto) {
    const entry = await this.tournaments.findEntry(dto.entryId);
    await this.assertPayable(entry);

    const phone = normalizePhone(dto.phone);
    const amount = entry.tournament.entryFeeKz;
    const open = await this.prisma.tournamentPayment.findMany({
      where: { entryId: entry.id, status: { in: ['pending', 'paid'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (open.some((p) => p.status === 'paid')) {
      throw new ConflictException('Esta inscrição já foi paga.');
    }

    for (const candidate of open) {
      const current = await this.refresh(candidate);
      if (current.status === 'paid') {
        throw new ConflictException('Esta inscrição já foi paga.');
      }
      if (
        current.status === 'pending' &&
        current.paymentUrl &&
        current.method === dto.method &&
        current.amountKz === amount &&
        current.customerPhone === phone &&
        (!current.expiresAt || current.expiresAt.getTime() > Date.now())
      ) {
        return this.toPublic(current);
      }
    }

    await this.assertPayable(
      await this.prisma.tournamentEntry.findUniqueOrThrow({
        where: { id: entry.id },
      }),
    );

    const returnUrl = `${this.apiUrl()}/api/tournament-payments/return/${entry.id}`;
    const description =
      `Kwamikon Nexus 2026, inscrição ${entry.tournament.name}`.slice(0, 200);

    const tx = await this.vero.createTransaction({
      method: dto.method,
      amount,
      description,
      customer: { phone, name: entry.fullName },
      successUrl: returnUrl,
      failureUrl: `${returnUrl}?resultado=falhou`,
      metadata: { tournamentEntryId: entry.id },
    });

    if (!tx.paymentUrl) {
      this.logger.error(`Transação ${tx.id} criada sem paymentUrl.`);
    }

    const payment = await this.prisma.tournamentPayment.create({
      data: {
        id: tx.id,
        entryId: entry.id,
        method: tx.method ?? dto.method,
        amountKz: tx.amountKz ?? amount,
        status: tx.status ?? 'pending',
        customerPhone: tx.customerPhone ?? phone,
        paymentUrl: tx.paymentUrl,
        expiresAt: tx.expiresAt ? new Date(tx.expiresAt) : undefined,
        lastSyncedAt: new Date(),
      },
    });

    return this.toPublic(payment);
  }

  async status(id: string) {
    let payment = await this.prisma.tournamentPayment.findUnique({
      where: { id },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    if (payment.status === 'pending' && this.stale(payment)) {
      payment = await this.refresh(payment);
    }
    return this.toPublic(payment);
  }

  /** Regresso da página de pagamento: confirma o estado na Vero e devolve o URL de destino. */
  async acknowledge(entryId: string): Promise<string> {
    const site = this.siteUrl();
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      return `${site}/torneios`;
    }

    const open = await this.prisma.tournamentPayment.findMany({
      where: { entryId, status: { in: ['pending', 'expired'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    for (const payment of open) {
      await this.refresh(payment);
    }

    const [current, latest] = await Promise.all([
      this.prisma.tournamentEntry.findUniqueOrThrow({ where: { id: entryId } }),
      this.prisma.tournamentPayment.findFirst({
        where: { entryId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (current.status === 'CONFIRMADO' || latest?.status === 'pending') {
      return `${site}/torneios/sucesso?inscricao=${entryId}`;
    }
    return `${site}/torneios?pagamento=falhou`;
  }

  /** Resumo público da inscrição para a página de sucesso (o id é um UUID só conhecido de quem a criou). */
  async summary(entryId: string) {
    let entry = await this.tournaments.findEntry(entryId);

    const pending = await this.prisma.tournamentPayment.findFirst({
      where: { entryId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (entry.status === 'PENDENTE' && pending && this.stale(pending)) {
      await this.refresh(pending);
      entry = await this.tournaments.findEntry(entryId);
    }

    const latest = await this.prisma.tournamentPayment.findFirst({
      where: { entryId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: entry.id,
      fullName: entry.fullName,
      gamerTag: entry.gamerTag,
      tournament: {
        name: entry.tournament.name,
        game: entry.tournament.game,
        platform: entry.tournament.platform,
        eventDay: entry.tournament.eventDay,
        startTime: entry.tournament.startTime,
      },
      status: entry.status,
      paymentStatus: latest?.status ?? null,
      amountKz: latest?.amountKz ?? entry.tournament.entryFeeKz,
      email: maskEmail(entry.email),
      emailSent: Boolean(entry.emailSentAt),
    };
  }

  /** Backoffice: volta a consultar todas as cobranças ainda não pagas da inscrição. */
  async syncEntry(entryId: string) {
    await this.tournaments.findEntry(entryId);
    const open = await this.prisma.tournamentPayment.findMany({
      where: { entryId, status: { in: ['pending', 'expired', 'cancelled'] } },
    });
    for (const payment of open) {
      await this.apply(payment, await this.vero.getTransaction(payment.id));
    }
    return this.tournaments.findEntry(entryId);
  }

  /**
   * Chamado pelo webhook dos bilhetes quando a transação não é de uma reserva.
   * Devolve false se também não for de uma inscrição.
   */
  async handleTransaction(transactionId: string): Promise<boolean> {
    const payment = await this.prisma.tournamentPayment.findUnique({
      where: { id: transactionId },
    });
    if (!payment) return false;
    await this.apply(payment, await this.vero.getTransaction(payment.id));
    return true;
  }

  private stale(payment: TournamentPayment) {
    return (
      !payment.lastSyncedAt ||
      Date.now() - payment.lastSyncedAt.getTime() > SYNC_THROTTLE_MS
    );
  }

  private async refresh(payment: TournamentPayment) {
    try {
      return await this.apply(
        payment,
        await this.vero.getTransaction(payment.id),
      );
    } catch (err) {
      this.logger.warn(
        `Falha ao consultar pagamento ${payment.id}: ${(err as Error).message}`,
      );
      return this.prisma.tournamentPayment.update({
        where: { id: payment.id },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  /** Idempotente: o mesmo estado pode chegar pelo webhook, pelo regresso e pelo polling. */
  private async apply(payment: TournamentPayment, tx: VeroTransaction) {
    const becamePaid = tx.status === 'paid' && payment.status !== 'paid';
    const status =
      payment.status === 'cancelled' && tx.status === 'pending'
        ? 'cancelled'
        : tx.status;

    const updated = await this.prisma.tournamentPayment.update({
      where: { id: payment.id },
      data: {
        status,
        method: tx.method ?? payment.method,
        paymentUrl: tx.paymentUrl ?? payment.paymentUrl,
        referenceEntity: tx.referenceEntity ?? payment.referenceEntity,
        referenceNumber: tx.referenceNumber ?? payment.referenceNumber,
        expiresAt: tx.expiresAt ? new Date(tx.expiresAt) : payment.expiresAt,
        paidAt: becamePaid ? new Date(tx.paidAt ?? Date.now()) : payment.paidAt,
        lastSyncedAt: new Date(),
      },
    });

    if (tx.status === 'paid') {
      await this.confirmEntry(updated, tx);
    } else if (FAILED_STATUSES.has(status)) {
      await this.cancelAfterFailure(updated);
    }
    return updated;
  }

  private async cancelAfterFailure(payment: TournamentPayment) {
    const other = await this.prisma.tournamentPayment.count({
      where: {
        entryId: payment.entryId,
        id: { not: payment.id },
        status: { in: ['pending', 'paid'] },
      },
    });
    if (other > 0) return;

    if (
      await this.tournaments.cancelUnpaid(payment.entryId, 'PAGAMENTO_FALHOU')
    ) {
      this.logger.log(
        `Inscrição ${payment.entryId} cancelada: pagamento ${payment.id} ${payment.status}.`,
      );
    }
  }

  private async expire(entryId: string) {
    const pending = await this.prisma.tournamentPayment.findMany({
      where: { entryId, status: 'pending' },
    });
    for (const payment of pending) {
      await this.refresh(payment);
    }

    if (!(await this.tournaments.cancelUnpaid(entryId, 'PAGAMENTO_EXPIRADO'))) {
      return;
    }
    await this.prisma.tournamentPayment.updateMany({
      where: { entryId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    this.logger.log(
      `Inscrição ${entryId} cancelada: pagamento não confirmado em ${PAYMENT_WINDOW_MS / 60_000} minutos.`,
    );
  }

  private async assertPayable(entry: TournamentEntry) {
    let { status } = entry;
    if (
      status === 'PENDENTE' &&
      Date.now() - entry.createdAt.getTime() > PAYMENT_WINDOW_MS
    ) {
      await this.expire(entry.id);
      ({ status } = await this.prisma.tournamentEntry.findUniqueOrThrow({
        where: { id: entry.id },
      }));
    }

    if (status === 'CANCELADO') {
      throw new GoneException(CANCELLED_MESSAGE);
    }
    if (status !== 'PENDENTE') {
      throw new BadRequestException(
        'Esta inscrição já não está pendente de pagamento.',
      );
    }
  }

  private async confirmEntry(payment: TournamentPayment, tx: VeroTransaction) {
    if (typeof tx.amountKz === 'number' && tx.amountKz < payment.amountKz) {
      this.logger.error(
        `Pagamento ${payment.id} pago com ${tx.amountKz} Kz, esperado ${payment.amountKz} Kz. Inscrição não confirmada.`,
      );
      return;
    }

    const entry = await this.tournaments.findEntry(payment.entryId);
    if (entry.status === 'PENDENTE') {
      await this.tournaments.updateEntryStatus(entry.id, 'CONFIRMADO');
      this.logger.log(
        `Inscrição ${entry.id} confirmada pelo pagamento ${payment.id}.`,
      );
    } else if (entry.status === 'CANCELADO' && entry.cancelReason) {
      // Pago depois do prazo (ex.: referência paga mais tarde): o jogador pagou, por
      // isso a inscrição é confirmada mesmo que o torneio fique acima das vagas.
      await this.tournaments.updateEntryStatus(entry.id, 'CONFIRMADO');
      this.logger.warn(
        `Inscrição ${entry.id} cancelada automaticamente (${entry.cancelReason}) e confirmada pelo pagamento tardio ${payment.id}. Verificar as vagas do torneio.`,
      );
    } else if (entry.status === 'CANCELADO') {
      this.logger.warn(
        `Pagamento ${payment.id} recebido para a inscrição cancelada ${entry.id}. Rever manualmente.`,
      );
    }
  }

  private toPublic(payment: TournamentPayment) {
    return {
      id: payment.id,
      entryId: payment.entryId,
      method: payment.method,
      amountKz: payment.amountKz,
      status: payment.status,
      customerPhone: payment.customerPhone,
      paymentUrl: payment.paymentUrl,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }

  private siteUrl() {
    return this.config
      .get<string>('PUBLIC_SITE_URL', 'http://localhost:5173')
      .replace(/\/$/, '');
  }

  private apiUrl() {
    const port = this.config.get<string>('PORT', '3333');
    return this.config
      .get<string>('PUBLIC_API_URL', `http://localhost:${port}`)
      .replace(/\/$/, '');
  }
}
