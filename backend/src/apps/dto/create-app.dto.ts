import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { APP_ERROR_CODES, APP_ERRORS } from '../../config/errors/apps-error-code';

export type AppPermission = 'read_only' | 'read_write';

export class CreateAppDTO {
    @IsString()
    @MinLength(1, { message: APP_ERRORS[APP_ERROR_CODES.NAME_REQUIRED] })
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsIn(['read_only', 'read_write'])
    permission?: AppPermission;
}
