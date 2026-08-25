import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { OrganizationsRepository, OrgRole } from './organizations.repository';
import { ROLES_KEY } from './roles.decorator';
import {
  ORG_ERROR_CODES,
  ORG_ERRORS,
} from '../../config/errors/organizations-error-code';

declare module 'express-serve-static-core' {
  interface Request {
    orgRole?: OrgRole;
  }
}

// owner eng yuqori, viewer eng past — "kamida shu rol" tekshiruvi shu
// tartib bo'yicha qilinadi.
const ROLE_RANK: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  developer: 2,
  operator: 1,
  viewer: 0,
};

/**
 * `@Roles('admin')` qo'yilgan handler'lar uchun: route'dagi `:id`
 * parametrini tashkilot ID deb oladi, so'rov yuborgan user'ning shu
 * tashkilotdagi a'zoligini tekshiradi, roli talab qilingandan past
 * bo'lsa 403 qaytaradi. `@Roles` qo'yilmagan handler'larga tegmaydi
 * (faqat a'zolikni tekshiradigan yengilroq holatlar uchun controller
 * o'zi `organizationsService.requireMembership` chaqirishi mumkin).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly orgRepo: OrganizationsRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      OrgRole[] | undefined
    >(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const organizationId = (req.params.id ?? req.params.organizationId) as
      string | undefined;
    const userId = req.userId;

    if (!organizationId || !userId) return false;

    const membership = await this.orgRepo.findMembership(
      organizationId,
      userId,
    );
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException({
        code: ORG_ERROR_CODES.NOT_A_MEMBER,
        message: ORG_ERRORS[ORG_ERROR_CODES.NOT_A_MEMBER],
      });
    }

    const minRequiredRank = Math.min(...requiredRoles.map((r) => ROLE_RANK[r]));
    if (ROLE_RANK[membership.role] < minRequiredRank) {
      throw new ForbiddenException({
        code: ORG_ERROR_CODES.INSUFFICIENT_ROLE,
        message: ORG_ERRORS[ORG_ERROR_CODES.INSUFFICIENT_ROLE],
      });
    }

    // Keyingi handler'lar `req.orgRole` orqali qo'shimcha tekshiruv
    // qilishi mumkin (masalan "faqat owner o'chira oladi").
    req.orgRole = membership.role;
    return true;
  }
}
