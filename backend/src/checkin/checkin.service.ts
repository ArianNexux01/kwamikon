import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { eventDayOf, parseEventDays } from '../common/event-days';

export type CheckinResult =
  | {
      outcome: 'ok';
      fullName: string;
      ticketType: string;
      quantity: number;
      checkedInAt: Date;
      eventDay: string;
      /** Dias de evento em que este bilhete ainda pode entrar. */
      remainingDays: string[];
    }
  | {
      outcome: 'already_used';
      fullName: string;
      ticketType: string;
      checkedInAt: Date | null;
      eventDay: string;
    }
  | { outcome: 'not_event_day'; day: string; eventDays: string[] }
  | { outcome: 'not_confirmed'; status: string }
  | { outcome: 'not_found' };

/** Leituras offline mais antigas do que isto (ou no futuro) usam a hora do servidor. */
const MAX_OFFLINE_AGE_MS = 36 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class CheckinService {
  private readonly eventDays: string[];

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.eventDays = parseEventDays(config.get<string>('EVENT_DAYS'));
  }

  /** Estado do dia para o ecrã da porta. */
  async today() {
    const day = eventDayOf(new Date());
    const isEventDay = this.eventDays.includes(day);
    const entries = isEventDay
      ? await this.prisma.checkIn.count({ where: { eventDay: day } })
      : 0;
    return { day, isEventDay, eventDays: this.eventDays, entries };
  }

  async validate(code: string, scannedAt?: string): Promise<CheckinResult> {
    const at = this.resolveScanTime(scannedAt);
    const day = eventDayOf(at);

    const reservation = await this.prisma.reservation.findUnique({
      where: { qrCode: code },
      include: { ticketType: true, checkIns: true },
    });

    if (!reservation) {
      return { outcome: 'not_found' };
    }

    if (
      reservation.status !== 'CONFIRMADO' &&
      reservation.status !== 'UTILIZADO'
    ) {
      return { outcome: 'not_confirmed', status: reservation.status };
    }

    if (!this.eventDays.includes(day)) {
      return { outcome: 'not_event_day', day, eventDays: this.eventDays };
    }

    const alreadyToday = reservation.checkIns.find((c) => c.eventDay === day);
    if (alreadyToday) {
      return this.alreadyUsed(reservation, alreadyToday.checkedInAt, day);
    }

    try {
      await this.prisma.checkIn.create({
        data: { reservationId: reservation.id, eventDay: day, checkedInAt: at },
      });
    } catch (err) {
      // Outro dispositivo validou o mesmo bilhete neste instante: a restrição única decide.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.checkIn.findUnique({
          where: {
            reservationId_eventDay: {
              reservationId: reservation.id,
              eventDay: day,
            },
          },
        });
        return this.alreadyUsed(
          reservation,
          existing?.checkedInAt ?? null,
          day,
        );
      }
      throw err;
    }

    const usedDays = new Set([
      ...reservation.checkIns.map((c) => c.eventDay),
      day,
    ]);
    const remainingDays = this.eventDays.filter((d) => !usedDays.has(d));

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        checkedInAt: at,
        // Só fica "utilizado" quando já entrou em todos os dias do evento.
        status: remainingDays.length === 0 ? 'UTILIZADO' : 'CONFIRMADO',
      },
    });

    return {
      outcome: 'ok',
      fullName: reservation.fullName,
      ticketType: reservation.ticketType.name,
      quantity: reservation.quantity,
      checkedInAt: at,
      eventDay: day,
      remainingDays,
    };
  }

  private alreadyUsed(
    reservation: { fullName: string; ticketType: { name: string } },
    checkedInAt: Date | null,
    day: string,
  ): CheckinResult {
    return {
      outcome: 'already_used',
      fullName: reservation.fullName,
      ticketType: reservation.ticketType.name,
      checkedInAt,
      eventDay: day,
    };
  }

  private resolveScanTime(scannedAt?: string): Date {
    const now = Date.now();
    if (!scannedAt) return new Date(now);
    const at = new Date(scannedAt).getTime();
    if (
      Number.isNaN(at) ||
      at > now + MAX_CLOCK_SKEW_MS ||
      now - at > MAX_OFFLINE_AGE_MS
    ) {
      return new Date(now);
    }
    return new Date(at);
  }
}
