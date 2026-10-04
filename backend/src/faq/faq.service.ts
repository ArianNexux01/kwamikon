import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FaqItemDto } from './dto/faq-item.dto';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.faqItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Uma pergunta nova entra no fim da lista. */
  async create(dto: FaqItemDto) {
    const last = await this.prisma.faqItem.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.faqItem.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async update(id: string, dto: FaqItemDto) {
    await this.findOne(id);
    return this.prisma.faqItem.update({
      where: { id },
      data: { question: dto.question, answer: dto.answer },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.faqItem.delete({ where: { id } });
  }

  async reorder(ids: string[]) {
    const existing = await this.prisma.faqItem.findMany({
      select: { id: true },
    });
    const known = new Set(existing.map((item) => item.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !known.has(id))
    ) {
      throw new BadRequestException(
        'A lista de perguntas mudou entretanto. Recarrega a página e tenta novamente.',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.faqItem.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.list();
  }

  private async findOne(id: string) {
    const item = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Pergunta não encontrada.');
    }
    return item;
  }
}
