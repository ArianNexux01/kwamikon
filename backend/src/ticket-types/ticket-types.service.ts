import { Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * O novo preço vale para as cobranças criadas a partir de agora. As que já estão
   * abertas mantêm o valor com que foram criadas (ver PaymentsService.create).
   */
  async updatePrice(id: string, refPrice: number) {
    const type = await this.prisma.ticketType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException('Tipo de bilhete não encontrado.');
    }
    return this.prisma.ticketType.update({ where: { id }, data: { refPrice } });
  }
}
