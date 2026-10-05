import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Campo opcional: texto vazio passa a null, para o organizador o poder apagar. */
const trimOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ProgramItemDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Escolhe o dia.' })
  eventDay: string;

  @Matches(TIME, { message: 'Indica a hora de início no formato 14:00.' })
  startTime: string;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(TIME, { message: 'Indica a hora de fim no formato 14:00.' })
  endTime?: string | null;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'O título tem de ter pelo menos 3 caracteres.' })
  @MaxLength(120, { message: 'O título pode ter no máximo 120 caracteres.' })
  title: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(60, { message: 'A zona pode ter no máximo 60 caracteres.' })
  zone?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500, { message: 'A descrição pode ter no máximo 500 caracteres.' })
  description?: string | null;
}
