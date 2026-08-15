import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TemplatesRepository } from './templates.repository';
import { TemplateManifest } from './templates.types';

@Injectable()
export class TemplatesService implements OnModuleInit {
    private readonly logger = new Logger(TemplatesService.name);
    private readonly storageRoot = path.resolve(process.cwd(), 'templates-storage');

    constructor(private readonly repo: TemplatesRepository) {}

    async onModuleInit() {
        await this.syncFromDisk();
    }

    async syncFromDisk() {
        const entries = await fs.readdir(this.storageRoot, { withFileTypes: true });
        const dirs = entries.filter((e) => e.isDirectory());

        for (const dir of dirs) {
            const templatePath = path.join(this.storageRoot, dir.name);
            const manifestPath = path.join(templatePath, 'template.json');

            try {
                const raw = await fs.readFile(manifestPath, 'utf-8');
                const manifest: TemplateManifest = JSON.parse(raw);

                await this.repo.upsert({
                    slug: manifest.slug,
                    name: manifest.name,
                    description: manifest.description ?? null,
                    path: templatePath,
                    actions: manifest.actions,
                });
                this.logger.log(`Synced template: ${manifest.slug}`);
            } catch (err) {
                this.logger.warn(`Skipping "${dir.name}": ${(err as Error).message}`);
            }
        }
    }

    async findAll() {
        const { rows } = await this.repo.findAll();
        return rows;
    }

    async findById(Id: string) {
        const { rows } = await this.repo.findById(Id);
        if (!rows[0]) throw new NotFoundException(`Template "${Id}" not found`);
        return rows[0];
    }
}