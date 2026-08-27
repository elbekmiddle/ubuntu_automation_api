import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFleetRunDTO {
    @IsString()
    @MinLength(1)
    templateSlug: string;

    @IsString()
    @MinLength(1)
    action: string;

    @IsOptional()
    @IsObject()
    args?: Record<string, unknown>;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(1000)
    @IsString({ each: true })
    appIds: string[];

    // DeviceSelector'da tanlangan filtr — faqat audit/tarix uchun saqlanadi,
    // dispatch mantig'ida ishlatilmaydi (haqiqiy target ro'yxati appIds).
    @IsOptional()
    @IsObject()
    deviceFilter?: Record<string, unknown>;
}
