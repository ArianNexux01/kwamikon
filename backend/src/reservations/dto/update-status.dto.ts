import { IsIn } from 'class-validator';

export const RESERVATION_STATUSES = [
  'PENDENTE',
  'CONFIRMADO',
  'CANCELADO',
] as const;
export type ReservationStatusInput = (typeof RESERVATION_STATUSES)[number];

export class UpdateStatusDto {
  @IsIn(RESERVATION_STATUSES)
  status: ReservationStatusInput;
}
