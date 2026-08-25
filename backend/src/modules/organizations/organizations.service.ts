import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository, OrgRole } from './organizations.repository';
import { ORG_ERROR_CODES, ORG_ERRORS } from '../../config/errors/organizations-error-code';

@Injectable()
export class OrganizationsService {
    constructor(private readonly repo: OrganizationsRepository) {}

    async create(userId: string, userEmail: string, name: string) {
        const org = await this.repo.create(name, userId);
        await this.repo.addMember(org.id, userEmail, 'owner', 'active', userId, null);
        return org;
    }

    async findAllForUser(userId: string) {
        return this.repo.findAllForUser(userId);
    }

    async findOneForUser(userId: string, id: string) {
        const membership = await this.repo.findMembership(id, userId);
        if (!membership) {
            throw new NotFoundException({ code: ORG_ERROR_CODES.NOT_FOUND, message: ORG_ERRORS[ORG_ERROR_CODES.NOT_FOUND] });
        }
        const org = await this.repo.findById(id);
        if (!org) {
            throw new NotFoundException({ code: ORG_ERROR_CODES.NOT_FOUND, message: ORG_ERRORS[ORG_ERROR_CODES.NOT_FOUND] });
        }
        return { ...org, role: membership.role };
    }

    async listMembers(organizationId: string) {
        return this.repo.listMembers(organizationId);
    }

    /**
     * Email bo'yicha taklif qiladi. Agar shu email bilan foydalanuvchi
     * allaqachon ro'yxatdan o'tgan bo'lsa (lekin `user_id` biz bilmaymiz —
     * bu yerda users jadvaliga qarash organizations modulining ishi emas),
     * baribir status='pending' bilan qo'shamiz; keyingi safar shu user
     * login qilganda AuthService uni "active"ga o'tkazmaydi (faqat
     * ro'yxatdan o'tishda bog'lanadi) — shuning uchun taklif tugmasi
     * "hali ro'yxatdan o'tmagan odamlar" uchun ishlaydi deb hujjatlashtiramiz;
     * mavjud user'ni to'g'ridan-to'g'ri qo'shish keyingi bosqichda
     * users jadvalidan qidirib user_id bilan qo'shiladi (bu yerda soddalik
     * uchun email orqali, invitedBy bilan birga saqlanadi).
     */
    async inviteMember(organizationId: string, invitedBy: string, email: string, role: OrgRole) {
        const existing = await this.repo.findMemberByEmail(organizationId, email);
        if (existing) {
            throw new BadRequestException({
                code: ORG_ERROR_CODES.ALREADY_A_MEMBER,
                message: ORG_ERRORS[ORG_ERROR_CODES.ALREADY_A_MEMBER],
            });
        }
        return this.repo.addMember(organizationId, email, role, 'pending', null, invitedBy);
    }

    async updateMemberRole(organizationId: string, memberId: string, role: OrgRole) {
        const member = await this.repo.findMemberById(organizationId, memberId);
        if (!member) {
            throw new NotFoundException({ code: ORG_ERROR_CODES.MEMBER_NOT_FOUND, message: ORG_ERRORS[ORG_ERROR_CODES.MEMBER_NOT_FOUND] });
        }
        if (member.role === 'owner') {
            throw new ForbiddenException({
                code: ORG_ERROR_CODES.CANNOT_MODIFY_OWNER,
                message: ORG_ERRORS[ORG_ERROR_CODES.CANNOT_MODIFY_OWNER],
            });
        }
        return this.repo.updateMemberRole(memberId, role);
    }

    async removeMember(organizationId: string, memberId: string) {
        const member = await this.repo.findMemberById(organizationId, memberId);
        if (!member) {
            throw new NotFoundException({ code: ORG_ERROR_CODES.MEMBER_NOT_FOUND, message: ORG_ERRORS[ORG_ERROR_CODES.MEMBER_NOT_FOUND] });
        }
        if (member.role === 'owner') {
            throw new ForbiddenException({
                code: ORG_ERROR_CODES.CANNOT_MODIFY_OWNER,
                message: ORG_ERRORS[ORG_ERROR_CODES.CANNOT_MODIFY_OWNER],
            });
        }
        await this.repo.removeMember(memberId);
        return { removed: true };
    }

    async remove(userId: string, id: string) {
        const org = await this.repo.findById(id);
        if (!org) {
            throw new NotFoundException({ code: ORG_ERROR_CODES.NOT_FOUND, message: ORG_ERRORS[ORG_ERROR_CODES.NOT_FOUND] });
        }
        if (org.owner_user_id !== userId) {
            throw new ForbiddenException({
                code: ORG_ERROR_CODES.ONLY_OWNER_CAN_DELETE,
                message: ORG_ERRORS[ORG_ERROR_CODES.ONLY_OWNER_CAN_DELETE],
            });
        }
        await this.repo.remove(id);
        return { removed: true };
    }

    /** AuthService.register chaqiradi — pending invite'larni yangi user'ga bog'laydi. */
    async linkPendingInvites(userId: string, email: string) {
        await this.repo.linkPendingInvites(userId, email);
    }

    /** AuthService.register chaqiradi — har bir yangi user shaxsiy workspace bilan boshlaydi. */
    async createPersonalWorkspace(userId: string, email: string, displayName: string | null) {
        const name = `${displayName ?? email.split('@')[0]}'s workspace`;
        return this.create(userId, email, name);
    }
}
