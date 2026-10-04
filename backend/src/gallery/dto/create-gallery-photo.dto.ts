import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGalleryPhotoDto {
  /** Legenda curta mostrada sobre a fotografia e usada como texto alternativo. */
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'A legenda pode ter no máximo 120 caracteres.' })
  caption?: string;
}
