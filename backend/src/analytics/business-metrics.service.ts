import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Attributes, metrics } from '@opentelemetry/api';
import { PrismaService } from '../prisma/prisma.service';
import { eventDayOf } from '../common/event-days';
import { telemetryEnabled } from '../telemetry';

type Sample = { value: number; attributes: Attributes };

/** As métricas são exportadas a cada 15 s; a base de dados é lida a cada 30 s. */
const REFRESH_MS = 30_000;
/** Um visitante conta como "activo agora" se viu uma página nos últimos 5 minutos. */
const ACTIVE_WINDOW_MS = 5 * 60_000;

/**
 * Métricas lidas da base de dados (visitantes únicos, reservas, receita, check-ins).
 * São gauges: refletem o estado guardado e não se perdem quando a API reinicia,
 * ao contrário dos contadores em memória.
 */
@Injectable()
export class BusinessMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BusinessMetricsService.name);
  private readonly samples = new Map<string, Sample[]>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!telemetryEnabled) return;

    const meter = metrics.getMeter('kwamikon-api');
    const gauges: [string, string][] = [
      [
        'kwamikon.visitors.active',
        'Visitantes com páginas vistas nos últimos 5 minutos',
      ],
      [
        'kwamikon.visitors.unique',
        'Visitantes únicos por período (today = dia actual em Luanda)',
      ],
      ['kwamikon.sessions', 'Sessões por período'],
      [
        'kwamikon.page_views.by_period',
        'Páginas vistas por período (guardadas na base de dados)',
      ],
      ['kwamikon.reservations', 'Reservas de bilhetes por estado'],
      [
        'kwamikon.tickets.sold',
        'Bilhetes vendidos (reservas confirmadas ou utilizadas) por tipo',
      ],
      ['kwamikon.revenue', 'Receita paga em Kz, por produto'],
      ['kwamikon.payments', 'Pagamentos Vero por produto, método e estado'],
      ['kwamikon.checkins', 'Entradas registadas no recinto por dia do evento'],
      [
        'kwamikon.tournament.entries',
        'Inscrições em torneios por torneio e estado',
      ],
    ];
    for (const [name, description] of gauges) {
      meter
        .createObservableGauge(name, { description })
        .addCallback((result) => {
          for (const s of this.samples.get(name) ?? [])
            result.observe(s.value, s.attributes);
        });
    }

    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async refresh() {
    try {
      const groups = await Promise.all([
        this.visitorSamples(),
        this.businessSamples(),
      ]);
      for (const group of groups) {
        for (const [name, samples] of Object.entries(group))
          this.samples.set(name, samples);
      }
    } catch (err) {
      this.logger.warn(
        `Falha ao ler métricas da base de dados: ${(err as Error).message}`,
      );
    }
  }

  private async visitorSamples(): Promise<Record<string, Sample[]>> {
    const now = Date.now();
    // Angola é UTC+1 todo o ano: o dia de hoje em Luanda começa às 00:00+01:00.
    const startOfToday = new Date(
      `${eventDayOf(new Date(now))}T00:00:00+01:00`,
    );
    const periods: [string, Date][] = [
      ['today', startOfToday],
      ['24h', new Date(now - 24 * 3600_000)],
      ['7d', new Date(now - 7 * 24 * 3600_000)],
      ['all', new Date(0)],
    ];

    const count = async (expr: string, since: Date) => {
      const rows = await this.prisma.$queryRawUnsafe<{ n: bigint | number }[]>(
        `SELECT ${expr} AS n FROM "PageView" WHERE "createdAt" >= ?`,
        since,
      );
      return Number(rows[0]?.n ?? 0);
    };

    const unique: Sample[] = [];
    const sessions: Sample[] = [];
    const views: Sample[] = [];
    for (const [period, since] of periods) {
      const [u, s, v] = await Promise.all([
        count('COUNT(DISTINCT "visitorId")', since),
        count('COUNT(DISTINCT "sessionId")', since),
        count('COUNT(*)', since),
      ]);
      unique.push({ value: u, attributes: { period } });
      sessions.push({ value: s, attributes: { period } });
      views.push({ value: v, attributes: { period } });
    }

    const active = await count(
      'COUNT(DISTINCT "visitorId")',
      new Date(now - ACTIVE_WINDOW_MS),
    );

    return {
      'kwamikon.visitors.active': [{ value: active, attributes: {} }],
      'kwamikon.visitors.unique': unique,
      'kwamikon.sessions': sessions,
      'kwamikon.page_views.by_period': views,
    };
  }

  private async businessSamples(): Promise<Record<string, Sample[]>> {
    const [
      reservations,
      sold,
      ticketTypes,
      payments,
      tournamentPayments,
      checkins,
      entries,
      tournaments,
    ] = await Promise.all([
      this.prisma.reservation.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.reservation.groupBy({
        by: ['ticketTypeId'],
        where: { status: { in: ['CONFIRMADO', 'UTILIZADO'] } },
        _sum: { quantity: true },
      }),
      this.prisma.ticketType.findMany({ select: { id: true, name: true } }),
      this.prisma.payment.groupBy({
        by: ['method', 'status'],
        _count: { _all: true },
        _sum: { amountKz: true },
      }),
      this.prisma.tournamentPayment.groupBy({
        by: ['method', 'status'],
        _count: { _all: true },
        _sum: { amountKz: true },
      }),
      this.prisma.checkIn.groupBy({ by: ['eventDay'], _count: { _all: true } }),
      this.prisma.tournamentEntry.groupBy({
        by: ['tournamentId', 'status'],
        _count: { _all: true },
      }),
      this.prisma.tournament.findMany({ select: { id: true, name: true } }),
    ]);

    const ticketName = new Map(ticketTypes.map((t) => [t.id, t.name]));
    const tournamentName = new Map(tournaments.map((t) => [t.id, t.name]));

    type PaymentRow = {
      method: string;
      status: string;
      _count: { _all: number };
      _sum: { amountKz: number | null };
    };
    const paidKz = (rows: PaymentRow[]) =>
      rows
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + (r._sum.amountKz ?? 0), 0);
    const paymentSamples = (product: string, rows: PaymentRow[]): Sample[] =>
      rows.map((r) => ({
        value: r._count._all,
        attributes: { product, method: r.method, status: r.status },
      }));

    return {
      'kwamikon.reservations': reservations.map((r) => ({
        value: r._count._all,
        attributes: { status: r.status },
      })),
      'kwamikon.tickets.sold': sold.map((r) => ({
        value: r._sum.quantity ?? 0,
        attributes: {
          ticket_type: ticketName.get(r.ticketTypeId) ?? r.ticketTypeId,
        },
      })),
      'kwamikon.revenue': [
        { value: paidKz(payments), attributes: { product: 'bilhetes' } },
        {
          value: paidKz(tournamentPayments),
          attributes: { product: 'torneios' },
        },
      ],
      'kwamikon.payments': [
        ...paymentSamples('bilhetes', payments),
        ...paymentSamples('torneios', tournamentPayments),
      ],
      'kwamikon.checkins': checkins.map((r) => ({
        value: r._count._all,
        attributes: { event_day: r.eventDay },
      })),
      'kwamikon.tournament.entries': entries.map((r) => ({
        value: r._count._all,
        attributes: {
          tournament: tournamentName.get(r.tournamentId) ?? r.tournamentId,
          status: r.status,
        },
      })),
    };
  }
}
