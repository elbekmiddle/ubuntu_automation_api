import { SetMetadata } from '@nestjs/common';
import { OrgRole } from './organizations.repository';

export const ROLES_KEY = 'org_roles';

/**
 * Handler'ga minimal talab qilinadigan rol(lar)ni belgilaydi. RolesGuard
 * bilan birga ishlatiladi va route'dagi `:id` (yoki `:organizationId`)
 * parametrini tashkilot ID sifatida o'qiydi.
 *
 * Misol: `@Roles('owner', 'admin')` — faqat owner yoki admin kira oladi.
 */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);
