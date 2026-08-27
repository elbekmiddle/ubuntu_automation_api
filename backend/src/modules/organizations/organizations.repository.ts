import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export type OrgRole = 'owner' | 'admin' | 'developer' | 'operator' | 'viewer';

export interface OrganizationRow {
    id: string;
    name: string;
    owner_user_id: string;
    created_at: Date;
    updated_at: Date;
}

export interface OrganizationMemberRow {
    id: string;
    organization_id: string;
    user_id: string | null;
    email: string;
    role: OrgRole;
    status: 'active' | 'pending';
    invited_by: string | null;
    created_at: Date;
}

@Injectable()
export class OrganizationsRepository {
    constructor(private readonly db: DatabaseService) {}

    async create(name: string, ownerUserId: string): Promise<OrganizationRow> {
        const { rows } = await this.db.query<OrganizationRow>(
            `INSERT INTO organizations (name, owner_user_id) VALUES ($1, $2) RETURNING *`,
            [name, ownerUserId],
        );
        return rows[0];
    }

    async findById(id: string): Promise<OrganizationRow | null> {
        const { rows } = await this.db.query<OrganizationRow>(`SELECT * FROM organizations WHERE id = $1`, [id]);
        return rows[0] ?? null;
    }

    /** Foydalanuvchi a'zo bo'lgan barcha tashkilotlar, uning shu tashkilotdagi roli bilan birga. */
    async findAllForUser(userId: string): Promise<(OrganizationRow & { role: OrgRole; member_count: number })[]> {
        const { rows } = await this.db.query(
            `SELECT o.*, m.role,
                    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id)::int AS member_count
             FROM organizations o
             JOIN organization_members m ON m.organization_id = o.id
             WHERE m.user_id = $1
             ORDER BY o.created_at ASC`,
            [userId],
        );
        return rows;
    }

    async addMember(
        organizationId: string,
        email: string,
        role: OrgRole,
        status: 'active' | 'pending',
        userId: string | null,
        invitedBy: string | null,
    ): Promise<OrganizationMemberRow> {
        const { rows } = await this.db.query<OrganizationMemberRow>(
            `INSERT INTO organization_members (organization_id, user_id, email, role, status, invited_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [organizationId, userId, email.toLowerCase(), role, status, invitedBy],
        );
        return rows[0];
    }

    async findMembership(organizationId: string, userId: string): Promise<OrganizationMemberRow | null> {
        const { rows } = await this.db.query<OrganizationMemberRow>(
            `SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
            [organizationId, userId],
        );
        return rows[0] ?? null;
    }

    async findMemberByEmail(organizationId: string, email: string): Promise<OrganizationMemberRow | null> {
        const { rows } = await this.db.query<OrganizationMemberRow>(
            `SELECT * FROM organization_members WHERE organization_id = $1 AND email = $2`,
            [organizationId, email.toLowerCase()],
        );
        return rows[0] ?? null;
    }

    async listMembers(organizationId: string): Promise<OrganizationMemberRow[]> {
        const { rows } = await this.db.query<OrganizationMemberRow>(
            `SELECT * FROM organization_members WHERE organization_id = $1 ORDER BY created_at ASC`,
            [organizationId],
        );
        return rows;
    }

    async findMemberById(organizationId: string, memberId: string): Promise<OrganizationMemberRow | null> {
        const { rows } = await this.db.query<OrganizationMemberRow>(
            `SELECT * FROM organization_members WHERE id = $1 AND organization_id = $2`,
            [memberId, organizationId],
        );
        return rows[0] ?? null;
    }

    async updateMemberRole(memberId: string, role: OrgRole): Promise<OrganizationMemberRow> {
        const { rows } = await this.db.query<OrganizationMemberRow>(
            `UPDATE organization_members SET role = $2 WHERE id = $1 RETURNING *`,
            [memberId, role],
        );
        return rows[0];
    }

    async removeMember(memberId: string): Promise<void> {
        await this.db.query(`DELETE FROM organization_members WHERE id = $1`, [memberId]);
    }

    async remove(id: string): Promise<void> {
        await this.db.query(`DELETE FROM organizations WHERE id = $1`, [id]);
    }

    /**
     * Yangi ro'yxatdan o'tgan user'ning email'iga mos "pending" invite'larni
     * shu user'ga bog'laydi (`user_id` o'rnatiladi, `status='active'`
     * bo'ladi) — invite ro'yxatdan o'tishdan OLDIN yuborilgan bo'lishi
     * mumkin bo'lgani uchun.
     */
    async linkPendingInvites(userId: string, email: string): Promise<void> {
        await this.db.query(
            `UPDATE organization_members SET user_id = $1, status = 'active'
             WHERE email = $2 AND status = 'pending'`,
            [userId, email.toLowerCase()],
        );
    }
}
