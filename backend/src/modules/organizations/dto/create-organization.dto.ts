import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  ORG_ERRORS,
  ORG_ERROR_CODES,
} from '../../../config/errors/organizations-error-code';

export class CreateOrganizationDTO {
  @IsString()
  @MinLength(1, { message: ORG_ERRORS[ORG_ERROR_CODES.NAME_REQUIRED] })
  @MaxLength(100)
  name: string;
}
