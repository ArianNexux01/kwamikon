import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeContact } from '../common/normalize-contact';
import { parseEventDays } from '../common/event-days';
import { AutoCancelReason, PAYMENT_WINDOW_MS } from '../payments/payment-rules';
import { TournamentDto } from './dto/tournament.dto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { EntryStatus } from './dto/update-entry-status.dto';
import { TournamentMailService } from './tournament-mail.service';

/**
 * Inscrições que ocupam vaga: as confirmadas e as pendentes ainda dentro do prazo de
 * pagamento. Uma pendente fora de prazo vai ser cancelada pela verificação periódica,
 * por isso já não conta.
 */
function holdingSpot(): Prisma.TournamentEntryWhereInput {
  return {
    OR: [
      { status: 'CONFIRMADO' },
      {
        status: 'PENDENTE',
        createdAt: { gte: new Date(Date.now() - PAYMENT_WINDOW_MS) },
      },
    ],
  };
}

@Injectable()
export class TournamentsService {
  private readonly eventDays: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: TournamentMailService,
    config: ConfigService,
  ) {
    this.eventDays = parseEventDays(config.get<string>('EVENT_DAYS'));
  }

  /** Lista pública: todos os torneios, com as vagas que ainda restam. */
  async listPublic() {
    const tournaments = await this.prisma.tournament.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const taken = await this.takenSpots();
    return tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      game: t.game,
      platform: t.platform,
      description: t.description,
      eventDay: t.eventDay,
      startTime: t.startTime,
      entryFeeKz: t.entryFeeKz,
      maxPlayers: t.maxPlayers,
      registrationOpen: t.registrationOpen,
      spotsLeft: Math.max(0, t.maxPlayers - (taken.get(t.id) ?? 0)),
    }));
  }

  /** Backoffice: torneios com as contagens de inscrições por estado. */
  async listAdmin() {
    const [tournaments, byStatus, taken] = await Promise.all([
      this.prisma.tournament.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.tournamentEntry.groupBy({
        by: ['tournamentId', 'status'],
        _count: true,
      }),
      this.takenSpots(),
    ]);
    const count = (id: string, status: string) =>
      byStatus.find((g) => g.tournamentId === id && g.status === status)
        ?._count ?? 0;

    return tournaments.map((t) => ({
      ...t,
      confirmed: count(t.id, 'CONFIRMADO'),
      pending: count(t.id, 'PENDENTE'),
      spotsLeft: Math.max(0, t.maxPlayers - (taken.get(t.id) ?? 0)),
    }));
  }

  async create(dto: TournamentDto) {
    this.assertEventDay(dto.eventDay);
    const last = await this.prisma.tournament.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.tournament.create({
      data: { ...this.data(dto), sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
  }

  async update(id: string, dto: TournamentDto) {
    await this.findOne(id);
    this.assertEventDay(dto.eventDay);
    return this.prisma.tournament.update({
      where: { id },
      data: this.data(dto),
    });
  }

  /** Só se apaga um torneio sem inscrições; com inscrições, fecha-se. */
  async remove(id: string) {
    await this.findOne(id);
    const entries = await this.prisma.tournamentEntry.count({
      where: { tournamentId: id },
    });
    if (entries > 0) {
      throw new BadRequestException(
        'Este torneio já tem inscrições e não pode ser apagado. Fecha as inscrições em vez disso.',
      );
    }
    await this.prisma.tournament.delete({ where: { id } });
  }

  /**
   * Cria a inscrição pendente de pagamento. A verificação de vagas e a criação correm
   * na mesma transacção (o SQLite serializa as escritas), para dois pedidos
   * simultâneos não ocuparem a última vaga ao mesmo tempo.
   */
  async createEntry(tournamentId: string, dto: CreateEntryDto) {
    const contactNorm = normalizeContact(dto.contact);

    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
      });
      if (!tournament) {
        throw new NotFoundException('Torneio não encontrado.');
      }
      if (!tournament.registrationOpen) {
        throw new BadRequestException(
          'As inscrições para este torneio estão fechadas.',
        );
      }

      const existing = await tx.tournamentEntry.findFirst({
        where: { tournamentId, contactNorm, ...holdingSpot() },
      });
      if (existing) {
        throw new ConflictException(
          existing.status === 'CONFIRMADO'
            ? 'Já existe uma inscrição confirmada neste torneio com este telemóvel.'
            : 'Já tens uma inscrição neste torneio à espera de pagamento. Conclui o pagamento ou espera 5 minutos para tentares de novo.',
        );
      }

      const taken = await tx.tournamentEntry.count({
        where: { tournamentId, ...holdingSpot() },
      });
      if (taken >= tournament.maxPlayers) {
        throw new ConflictException('As vagas para este torneio esgotaram.');
      }

      return tx.tournamentEntry.create({
        data: {
          tournamentId,
          fullName: dto.fullName,
          gamerTag: dto.gamerTag,
          contact: dto.contact,
          contactNorm,
          email: dto.email.toLowerCase(),
        },
        include: { tournament: true },
      });
    });
  }

  listEntries(tournamentId?: string) {
    return this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        tournament: { select: { id: true, name: true, entryFeeKz: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEntry(id: string) {
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { id },
      include: { tournament: true },
    });
    if (!entry) {
      throw new NotFoundException('Inscrição não encontrada.');
    }
    return entry;
  }

  async updateEntryStatus(id: string, status: EntryStatus) {
    const entry = await this.findEntry(id);

    const updated = await this.prisma.tournamentEntry.update({
      where: { id },
      data: {
        status,
        // Uma alteração feita à mão (ou um pagamento tardio) apaga o motivo automático.
        cancelReason: null,
        confirmedAt:
          status === 'CONFIRMADO' ? (entry.confirmedAt ?? new Date()) : null,
      },
      include: { tournament: true },
    });

    if (status === 'CONFIRMADO') {
      // Sem await: o email não deve atrasar o webhook nem o redireccionamento.
      void this.mail.sendOnce(id);
    }
    return updated;
  }

  /**
   * Cancela a inscrição só se ainda estiver pendente. A condição vai no próprio UPDATE
   * para não cancelar uma inscrição que um pagamento confirmou entretanto.
   */
  async cancelUnpaid(id: string, reason: AutoCancelReason) {
    const { count } = await this.prisma.tournamentEntry.updateMany({
      where: { id, status: 'PENDENTE' },
      data: { status: 'CANCELADO', cancelReason: reason },
    });
    return count > 0;
  }

  async exportCsv(tournamentId?: string) {
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        tournament: true,
        payments: { where: { status: 'paid' }, take: 1 },
      },
      orderBy: [{ tournamentId: 'asc' }, { createdAt: 'asc' }],
    });

    const header = [
      'Torneio',
      'Nome',
      'Nome de jogador',
      'Telemóvel',
      'Email',
      'Estado',
      'Valor pago (Kz)',
      'Inscrito em',
      'Confirmado em',
    ];
    const rows = entries.map((e) => [
      e.tournament.name,
      e.fullName,
      e.gamerTag,
      e.contact,
      e.email,
      e.status,
      e.payments[0] ? String(e.payments[0].amountKz) : '',
      e.createdAt.toISOString(),
      e.confirmedAt?.toISOString() ?? '',
    ]);

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    return (
      '﻿' + [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
    );
  }

  private async takenSpots() {
    const groups = await this.prisma.tournamentEntry.groupBy({
      by: ['tournamentId'],
      where: holdingSpot(),
      _count: true,
    });
    return new Map(groups.map((g) => [g.tournamentId, g._count]));
  }

  private async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });
    if (!tournament) {
      throw new NotFoundException('Torneio não encontrado.');
    }
    return tournament;
  }

  private assertEventDay(day?: string | null) {
    if (day && !this.eventDays.includes(day)) {
      throw new BadRequestException('O dia tem de ser um dos dias do evento.');
    }
  }

  private data(dto: TournamentDto) {
    return {
      name: dto.name,
      game: dto.game,
      platform: dto.platform ?? null,
      description: dto.description ?? null,
      eventDay: dto.eventDay ?? null,
      startTime: dto.startTime ?? null,
      entryFeeKz: dto.entryFeeKz,
      maxPlayers: dto.maxPlayers,
      registrationOpen: dto.registrationOpen,
    };
  }

  get days() {
    return this.eventDays;
  }
}
