import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Template } from './templates.types';

@Injectable()
export class TemplatesRepository {
    constructor(private readonly db: DatabaseService) {}

    findAll(): Promise<{ rows: Template[] }> {
        return this.db.query<Template>(
            `SELECT * FROM templates ORDER BY name`,
        );
    }

    findById(templateId: string): Promise<{ rows: Template[] }> {
        return this.db.query<Template>(
            `SELECT * FROM templates WHERE id = $1`,
            [templateId],
        );
    }
    findBySlug(Slug: string): Promise<{ rows: Template[] }> {
        return this.db.query<Template>(
            `SELECT * FROM templates WHERE slug = $1`,
            [Slug],
        );
    }

    /** Jamoatchilikka ochiq (is_public = true) templatelarni nom/slug/tavsif bo'yicha qidiradi. */
    async findPublic(query?: string, limit = 50): Promise<Template[]> {
        if (query?.trim()) {
            const { rows } = await this.db.query<Template>(
                `SELECT * FROM templates
         WHERE is_public = true
           AND (name ILIKE $1 OR slug ILIKE $1 OR description ILIKE $1)
         ORDER BY updated_at DESC
         LIMIT $2`,
                [`%${query.trim()}%`, limit],
            );
            return rows;
        }
        const { rows } = await this.db.query<Template>(
            `SELECT * FROM templates WHERE is_public = true ORDER BY updated_at DESC LIMIT $1`,
            [limit],
        );
        return rows;
    }

    async upsert(t: {
        slug: string;
        name: string;
        description: string | null;
        path: string;
        actions: string[];
        ownerId?: string | null;
        isPublic?: boolean;
    }): Promise<Template> {
        const { rows } = await this.db.query<Template>(
            `INSERT INTO templates (slug, name, description, path, actions, owner_id, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         path = EXCLUDED.path,
         actions = EXCLUDED.actions,
         updated_at = now()
       RETURNING *`,
            [
                t.slug,
                t.name,
                t.description,
                t.path,
                JSON.stringify(t.actions),
                t.ownerId ?? null,
                t.isPublic ?? false,
            ],
        );
        return rows[0];
    }

    async setVisibility(templateId: string, isPublic: boolean): Promise<Template | null> {
        const { rows } = await this.db.query<Template>(
            `UPDATE templates SET is_public = $2, updated_at = now() WHERE id = $1 RETURNING *`,
            [templateId, isPublic],
        );
        return rows[0] ?? null;
    }
}
