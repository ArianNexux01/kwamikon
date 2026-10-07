import {
  IsIn,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const WEB_VITALS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export type WebVitalName = (typeof WEB_VITALS)[number];

export class WebVitalDto {
  @IsIn(WEB_VITALS)
  name: WebVitalName;

  /** Milissegundos, excepto o CLS (sem unidade). */
  @IsNumber()
  @Min(0)
  @Max(600000)
  value: number;

  @IsString()
  @MaxLength(200)
  @Matches(/^\//)
  path: string;
}
