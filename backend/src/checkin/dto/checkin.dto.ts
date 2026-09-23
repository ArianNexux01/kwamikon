import { IsString, MinLength } from 'class-validator';

export class CheckinDto {
  @IsString()
  @MinLength(4)
  code: string;
}
