import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class PageViewDto {
  /** UUID aleatório guardado no localStorage do browser: identifica o visitante sem dados pessoais. */
  @IsUUID()
  visitorId: string;

  /** UUID guardado no sessionStorage: uma sessão por separador. */
  @IsUUID()
  sessionId: string;

  @IsString()
  @MaxLength(200)
  @Matches(/^\//)
  path: string;

  /** document.referrer da primeira página da sessão. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  /** utm_source do link de entrada (ex.: campanhas no Instagram). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  /** Primeira página da sessão. */
  @IsOptional()
  @IsBoolean()
  entry?: boolean;

  /** O visitorId acabou de ser criado: primeira visita neste browser. */
  @IsOptional()
  @IsBoolean()
  newVisitor?: boolean;
}
