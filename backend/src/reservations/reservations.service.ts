import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeContact } from '../common/normalize-contact';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { ReservationStatusInput } from './dto/update-status.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto) {
    const ticketType = await this.prisma.ticketType.findUnique({ where: { id: dto.ticketTypeId } });
    if (!ticketType || !ticketType.active) {
      throw new BadRequestException('Tipo de bilhete inválido.');
    }

    const contactNorm = normalizeContact(dto.contact);

    const existing = await this.prisma.reservation.findFirst({
      where: {
        contactNorm,
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe uma reserva pendente ou confirmada com este contacto. Contacta a organização se precisares de a alterar.',
      );
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        fullName: dto.fullName.trim(),
        contact: dto.contact.trim(),
        contactNorm,
        ticketTypeId: dto.ticketTypeId,
        quantity: dto.quantity,
        notes: dto.notes?.trim(),
      },
      include: { ticketType: true },
    });

    return reservation;
  }

  findAll(filters: ListReservationsDto) {
    return this.prisma.reservation.findMany({
      where: {
        status: filters.status,
        ticketTypeId: filters.ticketTypeId,
        ...(filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search } },
                { contact: { contains: filters.search } },
              ],
            }
          : {}),
      },
      include: { ticketType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { ticketType: true },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    return reservation;
  }

  async updateStatus(id: string, status: ReservationStatusInput) {
    const reservation = await this.findOne(id);

    if (reservation.status === 'UTILIZADO') {
      throw new BadRequestException('Este bilhete já foi utilizado no check-in e não pode ser alterado.');
    }

    const data: {
      status: ReservationStatusInput;
      qrCode?: string;
      confirmedAt?: Date;
    } = { status };

    if (status === 'CONFIRMADO' && !reservation.qrCode) {
      data.qrCode = randomUUID();
      data.confirmedAt = new Date();
    }

    return this.prisma.reservation.update({
      where: { id },
      data,
      include: { ticketType: true },
    });
  }

  async qrCodeImage(id: string) {
    const reservation = await this.findOne(id);
    if (!reservation.qrCode) {
      throw new BadRequestException('Esta reserva ainda não tem bilhete confirmado.');
    }
    return QRCode.toDataURL(reservation.qrCode, { margin: 1, width: 480 });
  }

  async metrics() {
    const [byStatus, byType, total] = await Promise.all([
      this.prisma.reservation.groupBy({ by: ['status'], _sum: { quantity: true }, _count: true }),
      this.prisma.reservation.groupBy({ by: ['ticketTypeId'], _sum: { quantity: true }, _count: true }),
      this.prisma.reservation.count(),
    ]);

    const ticketTypes = await this.prisma.ticketType.findMany();

    return {
      total,
      byStatus: byStatus.map((entry) => ({
        status: entry.status,
        reservas: entry._count,
        pessoas: entry._sum.quantity ?? 0,
      })),
      byType: byType.map((entry) => ({
        ticketTypeId: entry.ticketTypeId,
        name: ticketTypes.find((t) => t.id === entry.ticketTypeId)?.name ?? 'Desconhecido',
        reservas: entry._count,
        pessoas: entry._sum.quantity ?? 0,
      })),
    };
  }

  async exportCsv() {
    const reservations = await this.prisma.reservation.findMany({
      include: { ticketType: true },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Nome',
      'Contacto',
      'Tipo de bilhete',
      'Quantidade',
      'Estado',
      'Observações',
      'Criado em',
      'Confirmado em',
      'Check-in em',
    ];

    const rows = reservations.map((r) => [
      r.fullName,
      r.contact,
      r.ticketType.name,
      String(r.quantity),
      r.status,
      r.notes ?? '',
      r.createdAt.toISOString(),
      r.confirmedAt?.toISOString() ?? '',
      r.checkedInAt?.toISOString() ?? '',
    ]);

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');

    return '﻿' + csv;
  }
}
