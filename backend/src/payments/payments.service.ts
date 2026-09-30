import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import { Payment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VeroClient, VeroTransaction } from './vero.client';

/**
 * Intervalo mínimo entre duas consultas à Vero para a mesma cobrança. A documentação
 * pede no máximo uma consulta a cada 3 a 5 s (limite global de 200 pedidos/min).
 */
const SYNC_THROTTLE_MS = 4_000;

interface WebhookPayload {
  event?: string;
  transaction_id?: string;
  status?: string;
  amount?: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vero: VeroClient,
    private readonly reservations: ReservationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Cria a cobrança na Vero e devolve o paymentUrl, a página de pagamento alojada
   * para onde o frontend redirecciona o cliente.
   */
  async create(dto: CreatePaymentDto) {
    const reservation = await this.reservations.findOne(dto.reservationId);

    if (reservation.status !== 'PENDENTE') {
      throw new BadRequestException(
        'Esta reserva já não está pendente de pagamento.',
      );
    }

    const phone = this.normalizePhone(dto.phone);
    const open = await this.prisma.payment.findMany({
      where: {
        reservationId: reservation.id,
        status: { in: ['pending', 'paid'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (open.some((p) => p.status === 'paid')) {
      throw new ConflictException('Esta reserva já foi paga.');
    }

    // Uma cobrança ainda pendente para o mesmo telemóvel é reaproveitada: o cliente
    // volta à mesma página de pagamento em vez de ficar com duas cobranças abertas.
    for (const candidate of open) {
      const current = await this.refresh(candidate);
      if (current.status === 'paid') {
        throw new ConflictException('Esta reserva já foi paga.');
      }
      if (
        current.status === 'pending' &&
        current.paymentUrl &&
        current.customerPhone === phone &&
        (!current.expiresAt || current.expiresAt.getTime() > Date.now())
      ) {
        return this.toPublic(current);
      }
    }

    const amount = reservation.ticketType.refPrice * reservation.quantity;
    // A Vero devolve o cliente ao nosso endpoint de acknowledge, que confirma o estado
    // real antes de o mandar para a página de sucesso (ou de volta ao checkout).
    const returnUrl = `${this.apiUrl()}/api/payments/return/${reservation.id}`;
    const description =
      `Kwamikon Nexus 2026, ${reservation.ticketType.name} × ${reservation.quantity}`.slice(
        0,
        200,
      );

    const tx = await this.vero.createTransaction({
      method: dto.method,
      amount,
      description,
      customer: { phone, name: reservation.fullName },
      successUrl: returnUrl,
      failureUrl: `${returnUrl}?resultado=falhou`,
      metadata: { reservationId: reservation.id },
    });

    if (!tx.paymentUrl) {
      this.logger.error(`Transação ${tx.id} criada sem paymentUrl.`);
    }

    // Guardar sempre o id devolvido, mesmo com status pending: é ele que liga o webhook à reserva.
    const payment = await this.prisma.payment.create({
      data: {
        id: tx.id,
        reservationId: reservation.id,
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

  /**
   * Estado de uma cobrança para o ecrã "a confirmar pagamento". Enquanto estiver
   * pendente consulta a Vero (GET /api/transactions/:id), com limite de frequência.
   */
  async status(id: string) {
    let payment = await this.findOne(id);

    const stale =
      !payment.lastSyncedAt ||
      Date.now() - payment.lastSyncedAt.getTime() > SYNC_THROTTLE_MS;
    if (payment.status === 'pending' && stale) {
      payment = await this.refresh(payment);
    }

    return this.toPublic(payment);
  }

  /**
   * Acknowledge do regresso da página de pagamento. Nunca confia só no facto de o
   * cliente ter voltado: consulta a Vero, aplica o estado (o que confirma a reserva
   * e dispara o email do bilhete) e devolve o URL para onde o redireccionar.
   */
  async acknowledge(reservationId: string): Promise<string> {
    const site = this.siteUrl();
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      return `${site}/bilhetes`;
    }

    const open = await this.prisma.payment.findMany({
      where: { reservationId, status: { in: ['pending', 'expired'] } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    for (const payment of open) {
      await this.refresh(payment);
    }

    const [current, latest] = await Promise.all([
      this.prisma.reservation.findUniqueOrThrow({
        where: { id: reservationId },
      }),
      this.prisma.payment.findFirst({
        where: { reservationId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const confirmed =
      current.status === 'CONFIRMADO' || current.status === 'UTILIZADO';
    // Com o pagamento ainda pendente (ex.: referência por pagar) a página de sucesso
    // fica a acompanhar a confirmação; só mostra o bilhete quando estiver pago.
    if (confirmed || latest?.status === 'pending') {
      return `${site}/bilhetes/sucesso?reserva=${reservationId}`;
    }
    return `${site}/bilhetes?pagamento=falhou`;
  }

  /**
   * Resumo público do bilhete para a página de sucesso. O id da reserva (UUID) só é
   * conhecido por quem a criou; o QR code só é devolvido depois de pago.
   */
  async ticket(reservationId: string) {
    let reservation = await this.reservations.findOne(reservationId);

    const pending = await this.prisma.payment.findFirst({
      where: { reservationId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    const stale =
      pending &&
      (!pending.lastSyncedAt ||
        Date.now() - pending.lastSyncedAt.getTime() > SYNC_THROTTLE_MS);
    if (reservation.status === 'PENDENTE' && pending && stale) {
      await this.refresh(pending);
      reservation = await this.reservations.findOne(reservationId);
    }

    const latest = await this.prisma.payment.findFirst({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
    });
    const confirmed =
      reservation.status === 'CONFIRMADO' || reservation.status === 'UTILIZADO';

    return {
      id: reservation.id,
      fullName: reservation.fullName,
      ticketType: reservation.ticketType.name,
      quantity: reservation.quantity,
      status: reservation.status,
      paymentStatus: latest?.status ?? null,
      amountKz:
        latest?.amountKz ??
        reservation.ticketType.refPrice * reservation.quantity,
      email: reservation.email ? maskEmail(reservation.email) : null,
      ticketEmailSent: Boolean(reservation.ticketEmailSentAt),
      qrDataUrl:
        confirmed && reservation.qrCode
          ? await QRCode.toDataURL(reservation.qrCode, {
              margin: 1,
              width: 480,
            })
          : null,
    };
  }

  /** Backoffice: força a verificação de todas as cobranças pendentes de uma reserva. */
  async syncReservation(reservationId: string) {
    await this.reservations.findOne(reservationId);
    // Inclui as expiradas: uma referência expirada ainda pode passar a paga mais tarde.
    const open = await this.prisma.payment.findMany({
      where: { reservationId, status: { in: ['pending', 'expired'] } },
    });
    for (const payment of open) {
      await this.apply(payment, await this.vero.getTransaction(payment.id));
    }
    return this.reservations.findOne(reservationId);
  }

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ) {
    const secret = this.config.get<string>('VERO_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error(
        'Webhook recebido mas VERO_WEBHOOK_SECRET não está configurado.',
      );
      throw new UnauthorizedException();
    }
    if (!rawBody || !this.validSignature(rawBody, signature ?? '', secret)) {
      throw new UnauthorizedException('Assinatura inválida.');
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as WebhookPayload;
    if (!payload.transaction_id) {
      return { received: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.transaction_id },
    });
    if (!payment) {
      this.logger.warn(
        `Webhook ${payload.event} para transação desconhecida ${payload.transaction_id}.`,
      );
      return { received: true };
    }

    // Antes de entregar o bilhete confirmamos o estado directamente na API.
    const tx = await this.vero.getTransaction(payment.id);
    await this.apply(payment, tx);

    return { received: true };
  }

  /** Consulta a Vero; se falhar devolve o último estado conhecido (o webhook acaba por chegar). */
  private async refresh(payment: Payment): Promise<Payment> {
    try {
      return await this.apply(
        payment,
        await this.vero.getTransaction(payment.id),
      );
    } catch (err) {
      this.logger.warn(
        `Falha ao consultar pagamento ${payment.id}: ${(err as Error).message}`,
      );
      return this.prisma.payment.update({
        where: { id: payment.id },
        data: { lastSyncedAt: new Date() },
      });
    }
  }

  /**
   * Aplica o estado vindo da Vero. Idempotente: o mesmo evento pode chegar várias
   * vezes (webhook, retries, polling) e a reserva só é confirmada uma vez.
   */
  private async apply(payment: Payment, tx: VeroTransaction): Promise<Payment> {
    const becamePaid = tx.status === 'paid' && payment.status !== 'paid';

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: tx.status,
        // O cliente pode ter escolhido outro método na página de pagamento.
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
      await this.confirmReservation(updated, tx);
    }

    return updated;
  }

  private async confirmReservation(payment: Payment, tx: VeroTransaction) {
    if (typeof tx.amountKz === 'number' && tx.amountKz < payment.amountKz) {
      this.logger.error(
        `Pagamento ${payment.id} pago com ${tx.amountKz} Kz, esperado ${payment.amountKz} Kz. Reserva não confirmada.`,
      );
      return;
    }

    const reservation = await this.reservations.findOne(payment.reservationId);
    if (reservation.status === 'PENDENTE') {
      await this.reservations.updateStatus(reservation.id, 'CONFIRMADO');
      this.logger.log(
        `Reserva ${reservation.id} confirmada pelo pagamento ${payment.id}.`,
      );
    } else if (reservation.status === 'CANCELADO') {
      this.logger.warn(
        `Pagamento ${payment.id} recebido para a reserva cancelada ${reservation.id}. Rever manualmente.`,
      );
    }
  }

  private async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    return payment;
  }

  private toPublic(payment: Payment) {
    return {
      id: payment.id,
      reservationId: payment.reservationId,
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

  /** URL público desta API, usado no regresso da página de pagamento da Vero. */
  private apiUrl() {
    const port = this.config.get<string>('PORT', '3333');
    return this.config
      .get<string>('PUBLIC_API_URL', `http://localhost:${port}`)
      .replace(/\/$/, '');
  }

  private validSignature(rawBody: Buffer, signature: string, secret: string) {
    const expected =
      'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
    return (
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    );
  }

  private normalizePhone(raw: string) {
    const digits = raw.replace(/\D/g, '');
    return digits.slice(-9);
  }
}

/** "maria.santos@gmail.com" → "ma***@gmail.com": confirma o destino sem o expor. */
function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}
