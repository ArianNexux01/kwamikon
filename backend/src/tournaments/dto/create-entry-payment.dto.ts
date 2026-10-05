import { IsIn, IsString, Matches } from 'class-validator';

export class CreateEntryPaymentDto {
  @IsString()
  entryId: string;

  /** Método final: o cliente já não o pode trocar na página de pagamento da Vero. */
  @IsIn(['GPO', 'REF'])
  method: 'GPO' | 'REF';

  @IsString({ message: 'Indica o teu número de telemóvel.' })
  @Matches(/^(\+?244)?\s*9(\s?\d){8}$/, {
    message: 'Indica um número de telemóvel angolano válido (ex: 923 456 789).',
  })
  phone: string;
}
