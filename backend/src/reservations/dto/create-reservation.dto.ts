import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  contact: string;

  /** Para onde é enviado o bilhete com QR code depois do pagamento. */
  @IsEmail({}, { message: 'Indica um email válido para receberes o bilhete.' })
  @MaxLength(160, { message: 'O email é demasiado longo.' })
  email: string;

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
