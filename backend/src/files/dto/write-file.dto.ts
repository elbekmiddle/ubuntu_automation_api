import { IsString, MaxLength } from 'class-validator';

export class WriteFileDTO {
  @IsString()
  @MaxLength(20_000) // ~20KB — bir script fayl uchun yetarli chegara
  content: string;
}
