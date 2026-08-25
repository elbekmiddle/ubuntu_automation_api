import { IsIn } from 'class-validator';
import type { OrgRole } from '../organizations.repository';

const ASSIGNABLE_ROLES: OrgRole[] = ['admin', 'developer', 'operator', 'viewer'];

export class UpdateMemberRoleDTO {
    @IsIn(ASSIGNABLE_ROLES)
    role: OrgRole;
}
