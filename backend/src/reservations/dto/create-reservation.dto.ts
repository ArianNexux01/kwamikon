import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  contact: string;

  @IsString()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
