import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateEntryDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Indica o teu nome completo.' })
  @MaxLength(120)
  fullName: string;

  /** Nome de jogador (PSN ID, gamertag ou nickname) usado no chaveamento. */
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Indica o teu nome de jogador.' })
  @MaxLength(40, {
    message: 'O nome de jogador pode ter no máximo 40 caracteres.',
  })
  gamerTag: string;

  @Transform(trim)
  @IsString()
  @MinLength(9, { message: 'Indica o teu número de telemóvel.' })
  @MaxLength(20)
  contact: string;

  @Transform(trim)
  @IsEmail({}, { message: 'Indica um email válido.' })
  @MaxLength(160, { message: 'O email é demasiado longo.' })
  email: string;
}
