import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../database/database.service';

export interface TemplateVersion {
    id: string;
    template_id: string;
    version: number;
    manifest: Record<string, unknown>;
    files: Record<string, string>;
    device_id: string | null;
    created_at: Date;
}

@Injectable()
export class TemplateVersionsService {
    private readonly logger = new Logger(TemplateVersionsService.name);

    constructor(private readonly db: DatabaseService) {}

    /**
     * Template papkasining HOZIRGI holatini (edit qilinishidan OLDIN) snapshot qiladi,
     * so'ng templates.current_version'ni +1 oshiradi. FilesService.writeFile va
     * TemplatesService o'zgarish kiritishdan oldin shuni chaqiradi.
     */
    async snapshotBeforeChange(
        templateId: string,
        templatePath: string,
        deviceId: string | null,
    ): Promise<number> {
        const { rows: templateRows } = await this.db.query<{ current_version: number }>(
            `SELECT current_version FROM templates WHERE id = $1`,
            [templateId],
        );
        if (!templateRows[0]) {
            throw new NotFoundException(`Template "${templateId}" not found`);
        }
        const currentVersion = templateRows[0].current_version;

        const manifestPath = path.join(templatePath, 'template.json');
        let manifest: Record<string, unknown> = {};
        try {
            manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
        } catch {
            // manifest hali yozilmagan bo'lishi mumkin (birinchi versiya)
        }

        const files: Record<string, string> = {};
        try {
            const entries = await fs.readdir(templatePath, { withFileTypes: true });
            for (const entry of entries.filter((e) => e.isFile())) {
                files[entry.name] = await fs.readFile(path.join(templatePath, entry.name), 'utf-8');
            }
        } catch {
            // papka hali yaratilmagan bo'lishi mumkin
        }

        await this.db.query(
            `INSERT INTO template_versions (template_id, version, manifest, files, device_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (template_id, version) DO NOTHING`,
            [templateId, currentVersion, JSON.stringify(manifest), JSON.stringify(files), deviceId],
        );

        const nextVersion = currentVersion + 1;
        await this.db.query(`UPDATE templates SET current_version = $2 WHERE id = $1`, [
            templateId,
            nextVersion,
        ]);

        this.logger.log(`Snapshotted template ${templateId} as v${currentVersion}, now at v${nextVersion}`);
        return nextVersion;
    }

    async listVersions(templateId: string): Promise<TemplateVersion[]> {
        const { rows } = await this.db.query<TemplateVersion>(
            `SELECT * FROM template_versions WHERE template_id = $1 ORDER BY version DESC`,
            [templateId],
        );
        return rows;
    }

    async getVersion(templateId: string, version: number): Promise<TemplateVersion> {
        const { rows } = await this.db.query<TemplateVersion>(
            `SELECT * FROM template_versions WHERE template_id = $1 AND version = $2`,
            [templateId, version],
        );
        if (!rows[0]) {
            throw new NotFoundException(`Template "${templateId}" version ${version} not found`);
        }
        return rows[0];
    }

    /** Berilgan versiyadagi fayllarni diskka qaytarib yozadi (restore). */
    async restore(templateId: string, templatePath: string, version: number, deviceId: string | null) {
        const snapshot = await this.getVersion(templateId, version);

        // Restore qilishdan oldin ham hozirgi holatni saqlab qo'yamiz — restore ham geri qaytariladi
        await this.snapshotBeforeChange(templateId, templatePath, deviceId);

        await fs.writeFile(
            path.join(templatePath, 'template.json'),
            JSON.stringify(snapshot.manifest, null, 2),
            'utf-8',
        );
        for (const [fileName, content] of Object.entries(snapshot.files)) {
            await fs.writeFile(path.join(templatePath, fileName), content, 'utf-8');
        }

        return { restored: version };
    }
}
