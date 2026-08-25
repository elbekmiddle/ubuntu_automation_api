import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SetTagsDTO {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  // Faqat harf/raqam/tire/pastki chiziq — teglar target selector'da
  // qatnashadi, shuning uchun bo'sh joy yoki maxsus belgilarsiz, sodda
  // va URL/CLI'da yozish qulay bo'lsin.
  @Matches(/^[a-z0-9][a-z0-9-_]*$/, {
    each: true,
    message: "Teg faqat kichik harf, raqam, - va _ dan iborat bo'lishi kerak",
  })
  tags: string[];
}
