import { IsInt, Max, Min } from 'class-validator';

export class UpdateTicketPriceDto {
  /** Kwanzas, inteiro. A Vero não aceita cobranças abaixo de 100 Kz. */
  @IsInt({ message: 'O preço tem de ser um número inteiro de Kwanzas.' })
  @Min(100, { message: 'O preço mínimo é 100 Kz.' })
  @Max(10_000_000, { message: 'O preço máximo é 10 000 000 Kz.' })
  refPrice: number;
}
