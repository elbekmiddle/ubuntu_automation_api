import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class FilesService {
    constructor(private readonly templatesService: TemplatesService) {}

    private async resolveSafePath(TemplateId: string, fileName: string): Promise<string> {
        const template = await this.templatesService.findById(TemplateId);
        const templateRoot = path.resolve(template.path);

        // fileName ichida "../" bo'lishi mumkin emas — faqat oddiy fayl nomi
        const requested = path.resolve(templateRoot, fileName);

        if (!requested.startsWith(templateRoot + path.sep) && requested !== templateRoot) {
            throw new BadRequestException('Invalid file path');
        }

        return requested;
    }

    async listFiles(TemplateId: string) {
        const template = await this.templatesService.findById(TemplateId);
        const entries = await fs.readdir(template.path, { withFileTypes: true });
        return entries
            .filter((e) => e.isFile())
            .map((e) => e.name);
    }

    async readFile(TemplateId: string, fileName: string) {
        const filePath = await this.resolveSafePath(TemplateId, fileName);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { fileName, content };
        } catch {
            throw new NotFoundException(`File "${fileName}" not found`);
        }
    }

    async writeFile(TemplateId: string, fileName: string, content: string) {
        const filePath = await this.resolveSafePath(TemplateId, fileName);
        await fs.writeFile(filePath, content, 'utf-8');
        return { fileName, saved: true };
    }
}