import { IsEmail, IsIn } from 'class-validator';
import type { OrgRole } from '../organizations.repository';

const INVITABLE_ROLES: OrgRole[] = ['admin', 'developer', 'operator', 'viewer'];

export class InviteMemberDTO {
    @IsEmail()
    email: string;

    // 'owner' bu yerda ataylab yo'q — owner faqat tashkilot yaratilganda
    // avtomatik tayinlanadi, keyin qo'lda berilmaydi (bittadan ortiq
    // "haqiqiy" owner bo'lib qolmasligi uchun).
    @IsIn(INVITABLE_ROLES)
    role: OrgRole;
}
