import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_SCRIPT_LENGTH = 20_000; // ~20KB — oddiy bash script uchun yetarli, DoS'ga yo'l qo'ymaydi

export class CreateActionDto {
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'Action nomi faqat kichik harf, raqam va tire (-) bo\'lishi mumkin' })
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_SCRIPT_LENGTH)
  script: string;
}

export class CreateTemplateDTO {
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'Slug faqat kichik harf, raqam va tire (-) bo\'lishi mumkin' })
  @MaxLength(50)
  slug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateActionDto)
  actions: CreateActionDto[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
