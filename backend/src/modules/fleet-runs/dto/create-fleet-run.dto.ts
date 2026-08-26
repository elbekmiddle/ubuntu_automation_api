import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFleetRunDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  templateSlug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  action: string;

  @IsOptional()
  @IsObject()
  args?: Record<string, unknown>;

  // Target ro'yxati device ID orqali beriladi — nomi/statusi (online
  // yoki yo'q) klientdan ishonib olinmaydi, backend `AppsService` orqali
  // o'zi hisoblab chiqadi (shu userga tegishli ekanini ham shu yerda
  // tekshiradi).
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  targetAppIds: string[];
}
