import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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

    async upsert(t: {
        slug: string;
        name: string;
        description: string | null;
        path: string;
        actions: string[];
    }): Promise<Template> {
        const { rows } = await this.db.query<Template>(
            `INSERT INTO templates (slug, name, description, path, actions)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         path = EXCLUDED.path,
         actions = EXCLUDED.actions,
         updated_at = now()
       RETURNING *`,
            [t.slug, t.name, t.description, t.path, JSON.stringify(t.actions)],
        );
        return rows[0];
    }
}