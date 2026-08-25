import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Fleet automation'ning "target selector"i — "1000 ta mashinada shu
 * commandni bajar" xususiyati shu DTO orqali qaysi device'lar mos
 * kelishini aniqlaydi. Hozircha filtrlar faqat `apps` jadvalidagi mavjud
 * ustunlarga (`os_platform`, `tags`, `status`) asoslangan — `os version`
 * bo'yicha alohida filtr hali yo'q (`os_release` erkin matn, standart
 * qiymatlar to'plami yo'q), shuning uchun hozircha `platform`ga
 * birlashtirilgan; kerak bo'lsa keyinroq alohida maydon sifatida qo'shiladi.
 */
export class DeviceSelectorDTO {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(['linux', 'windows', 'darwin'], { each: true })
  platform?: Array<'linux' | 'windows' | 'darwin'>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  online?: boolean;
}
