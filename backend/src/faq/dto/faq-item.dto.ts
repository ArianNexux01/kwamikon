import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class FaqItemDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'A pergunta tem de ter pelo menos 3 caracteres.' })
  @MaxLength(200, { message: 'A pergunta pode ter no máximo 200 caracteres.' })
  question: string;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'A resposta tem de ter pelo menos 3 caracteres.' })
  @MaxLength(2000, {
    message: 'A resposta pode ter no máximo 2000 caracteres.',
  })
  answer: string;
}
