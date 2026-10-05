import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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

export class TournamentDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'O nome tem de ter pelo menos 3 caracteres.' })
  @MaxLength(80, { message: 'O nome pode ter no máximo 80 caracteres.' })
  name: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Indica o jogo.' })
  @MaxLength(80, { message: 'O jogo pode ter no máximo 80 caracteres.' })
  game: string;

  /** Opcional: por omissão joga-se nos equipamentos da organização. */
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(40, { message: 'A plataforma pode ter no máximo 40 caracteres.' })
  platform?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(1000, {
    message: 'A descrição pode ter no máximo 1000 caracteres.',
  })
  description?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Dia inválido.' })
  eventDay?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Indica a hora no formato 14:00.',
  })
  startTime?: string | null;

  /** A Vero não aceita cobranças abaixo de 100 Kz. */
  @IsInt({ message: 'A taxa tem de ser um valor inteiro em Kz.' })
  @Min(100, { message: 'A taxa mínima é de 100 Kz.' })
  @Max(10_000_000)
  entryFeeKz: number;

  @IsInt({ message: 'O número de vagas tem de ser inteiro.' })
  @Min(2, { message: 'Um torneio precisa de pelo menos 2 vagas.' })
  @Max(1024)
  maxPlayers: number;

  @IsBoolean()
  registrationOpen: boolean;
}
