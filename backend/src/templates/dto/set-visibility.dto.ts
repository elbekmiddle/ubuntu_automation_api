import { IsBoolean } from 'class-validator';

export class SetVisibilityDTO {
    @IsBoolean()
    isPublic: boolean;
}
