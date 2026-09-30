import { IsIn, IsString, Matches } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  reservationId: string;

  /** Método sugerido: na página de pagamento da Vero o cliente pode escolher outro. */
  @IsIn(['GPO', 'REF'])
  method: 'GPO' | 'REF';

  /** Telemóvel do cliente, obrigatório para qualquer método (9 dígitos, com ou sem +244). */
  @IsString({ message: 'Indica o teu número de telemóvel.' })
  @Matches(/^(\+?244)?\s*9(\s?\d){8}$/, {
    message: 'Indica um número de telemóvel angolano válido (ex: 923 456 789).',
  })
  phone: string;
}
