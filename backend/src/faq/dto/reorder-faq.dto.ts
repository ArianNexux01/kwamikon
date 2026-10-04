import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class ReorderFaqDto {
  /** Todos os ids, pela nova ordem. */
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids: string[];
}
