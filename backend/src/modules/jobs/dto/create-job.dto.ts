import { IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateJobDTO {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(50)
  templateSlug: string;

  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(50)
  action: string;

  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;

  // Berilsa — job shu App (agent) orqali masofada ishlaydi.
  @IsOptional()
  @IsUUID()
  appId?: string;
}
