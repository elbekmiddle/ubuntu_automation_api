import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class UpdateTagsDTO {
    @IsArray()
    @ArrayMaxSize(20, { message: 'Bitta device uchun ko\'pi bilan 20 ta tag qo\'yish mumkin' })
    @IsString({ each: true })
    @MaxLength(40, { each: true, message: 'Tag 40 belgidan oshmasligi kerak' })
    tags: string[];
}
