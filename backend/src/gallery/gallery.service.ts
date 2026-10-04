import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { GalleryPhoto } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Limite do upload; também aplicado ao multer no controller. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = resolve(config.get<string>('UPLOAD_DIR', 'uploads'));
  }

  async list() {
    const photos = await this.prisma.galleryPhoto.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return photos.map((photo) => this.toPublic(photo));
  }

  async create(file: Express.Multer.File | undefined, caption?: string) {
    if (!file) {
      throw new BadRequestException('Escolhe uma fotografia para carregar.');
    }

    // O tipo vem do conteúdo do ficheiro, não do nome nem do Content-Type do browser.
    const mimeType = detectImageType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException(
        'Formato não suportado. Usa uma fotografia JPG, PNG ou WebP.',
      );
    }

    const fileName = `${randomUUID()}.${EXTENSIONS[mimeType]}`;
    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(join(this.uploadDir, fileName), file.buffer);

    const photo = await this.prisma.galleryPhoto.create({
      data: { fileName, mimeType, caption: caption?.trim() || null },
    });
    return this.toPublic(photo);
  }

  /** Legenda vazia apaga-a: a fotografia passa a aparecer sem descrição. */
  async updateCaption(id: string, caption: string) {
    await this.findOne(id);
    const photo = await this.prisma.galleryPhoto.update({
      where: { id },
      data: { caption: caption.trim() || null },
    });
    return this.toPublic(photo);
  }

  async remove(id: string) {
    const photo = await this.findOne(id);
    await this.prisma.galleryPhoto.delete({ where: { id } });
    await unlink(join(this.uploadDir, photo.fileName)).catch((err: Error) =>
      this.logger.warn(
        `Fotografia ${id} apagada, mas o ficheiro não foi removido: ${err.message}`,
      ),
    );
  }

  /** Caminho do ficheiro no disco, para o controller o enviar. */
  async file(id: string) {
    const photo = await this.findOne(id);
    return {
      path: join(this.uploadDir, photo.fileName),
      mimeType: photo.mimeType,
    };
  }

  private async findOne(id: string) {
    const photo = await this.prisma.galleryPhoto.findUnique({ where: { id } });
    if (!photo) {
      throw new NotFoundException('Fotografia não encontrada.');
    }
    return photo;
  }

  private toPublic(photo: GalleryPhoto) {
    return {
      id: photo.id,
      caption: photo.caption,
      createdAt: photo.createdAt,
      /** Relativo ao prefixo /api. */
      path: `/gallery/${photo.id}/image`,
    };
  }
}

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
