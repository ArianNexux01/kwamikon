import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListReservationsDto {
  @IsOptional()
  @IsIn(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'UTILIZADO'])
  status?: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'UTILIZADO';

  @IsOptional()
  @IsString()
  ticketTypeId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
