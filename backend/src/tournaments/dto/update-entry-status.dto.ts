import { IsIn } from 'class-validator';

export const ENTRY_STATUSES = ['PENDENTE', 'CONFIRMADO', 'CANCELADO'] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export class UpdateEntryStatusDto {
  @IsIn(ENTRY_STATUSES)
  status: EntryStatus;
}
