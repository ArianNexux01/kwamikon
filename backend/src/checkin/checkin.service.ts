import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CheckinResult =
  | { outcome: 'ok'; fullName: string; ticketType: string; quantity: number; checkedInAt: Date }
  | { outcome: 'already_used'; fullName: string; ticketType: string; checkedInAt: Date | null }
  | { outcome: 'not_confirmed'; status: string }
  | { outcome: 'not_found' };

@Injectable()
export class CheckinService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string): Promise<CheckinResult> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { qrCode: code },
      include: { ticketType: true },
    });

    if (!reservation) {
      return { outcome: 'not_found' };
    }

    if (reservation.status === 'UTILIZADO') {
      return {
        outcome: 'already_used',
        fullName: reservation.fullName,
        ticketType: reservation.ticketType.name,
        checkedInAt: reservation.checkedInAt,
      };
    }

    if (reservation.status !== 'CONFIRMADO') {
      return { outcome: 'not_confirmed', status: reservation.status };
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'UTILIZADO', checkedInAt: new Date() },
      include: { ticketType: true },
    });

    return {
      outcome: 'ok',
      fullName: updated.fullName,
      ticketType: updated.ticketType.name,
      quantity: updated.quantity,
      checkedInAt: updated.checkedInAt as Date,
    };
  }
}
