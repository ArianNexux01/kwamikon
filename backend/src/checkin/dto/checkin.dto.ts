import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CheckinDto {
  @IsString()
  @MinLength(4)
  code: string;

  /**
   * Momento da leitura, enviado pela fila offline da porta: um código lido sem
   * rede às 23h50 de dia 31 tem de contar para dia 31, mesmo que sincronize no dia seguinte.
   */
  @IsOptional()
  @IsDateString()
  scannedAt?: string;
}
