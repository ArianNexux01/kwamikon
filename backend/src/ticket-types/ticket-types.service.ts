import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.ticketType.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAll() {
    return this.prisma.ticketType.findMany({ orderBy: { sortOrder: 'asc' } });
  }
}
