import { IsString, MaxLength } from 'class-validator';

export class UpdateGalleryPhotoDto {
  /** Texto vazio remove a legenda. */
  @IsString()
  @MaxLength(120, { message: 'A legenda pode ter no máximo 120 caracteres.' })
  caption: string;
}
