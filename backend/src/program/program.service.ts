import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { parseEventDays } from '../common/event-days';
import { ProgramItemDto } from './dto/program-item.dto';

@Injectable()
export class ProgramService {
  private readonly eventDays: string[];

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.eventDays = parseEventDays(config.get<string>('EVENT_DAYS'));
  }

  /** Ordenada por dia e hora: "09:30" < "10:00" funciona porque as horas têm sempre 2 dígitos. */
  async list() {
    const items = await this.prisma.programItem.findMany({
      orderBy: [
        { eventDay: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    return { eventDays: this.eventDays, items };
  }

  create(dto: ProgramItemDto) {
    this.validate(dto);
    return this.prisma.programItem.create({ data: this.data(dto) });
  }

  async update(id: string, dto: ProgramItemDto) {
    await this.findOne(id);
    this.validate(dto);
    return this.prisma.programItem.update({
      where: { id },
      data: this.data(dto),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.programItem.delete({ where: { id } });
  }

  private validate(dto: ProgramItemDto) {
    if (!this.eventDays.includes(dto.eventDay)) {
      throw new BadRequestException('O dia tem de ser um dos dias do evento.');
    }
    if (dto.endTime && dto.endTime <= dto.startTime) {
      throw new BadRequestException(
        'A hora de fim tem de ser depois da hora de início.',
      );
    }
  }

  private data(dto: ProgramItemDto) {
    return {
      eventDay: dto.eventDay,
      startTime: dto.startTime,
      endTime: dto.endTime ?? null,
      title: dto.title,
      zone: dto.zone ?? null,
      description: dto.description ?? null,
    };
  }

  private async findOne(id: string) {
    const item = await this.prisma.programItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Atividade não encontrada.');
    }
    return item;
  }
}
