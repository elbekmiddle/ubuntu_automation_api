import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateScheduleDTO {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(50)
  templateSlug: string;

  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(50)
  action: string;

  @IsString()
  @MaxLength(100)
  cron: string;

  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;
}
