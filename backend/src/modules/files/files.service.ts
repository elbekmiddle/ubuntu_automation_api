import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TemplatesService } from '../templates/templates.service';
import { TemplateVersionsService } from '../templates/template-versions.service';
import { FILE_ERROR_CODES, FILE_ERRORS } from '../../config/errors/file-error-code';

@Injectable()
export class FilesService {
    private readonly logger = new Logger(FilesService.name);

    constructor(
        private readonly templatesService: TemplatesService,
        private readonly templateVersions: TemplateVersionsService,
    ) {}

    private async resolveSafePath(templateId: string, fileName: string): Promise<string> {
        const template = await this.templatesService.findById(templateId);
        const templateRoot = path.resolve(template.path);

        // fileName ichida "../" bo'lishi mumkin emas — faqat oddiy fayl nomi
        const requested = path.resolve(templateRoot, fileName);

        if (!requested.startsWith(templateRoot + path.sep) && requested !== templateRoot) {
            throw new BadRequestException({
                code: FILE_ERROR_CODES.INVALID_PATH,
                message: FILE_ERRORS[FILE_ERROR_CODES.INVALID_PATH],
            });
        }

        return requested;
    }

    async listFiles(templateId: string) {
        const template = await this.templatesService.findById(templateId);
        try {
            const entries = await fs.readdir(template.path, { withFileTypes: true });
            return entries
                .filter((e) => e.isFile())
                .map((e) => e.name);
        } catch (error) {
            this.logger.error(
                `Failed to list files for template "${templateId}"`,
                error instanceof Error ? error.stack : String(error),
            );
            throw new HttpException(
                {
                    code: FILE_ERROR_CODES.LIST_FAILED,
                    message: FILE_ERRORS[FILE_ERROR_CODES.LIST_FAILED],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async readFile(templateId: string, fileName: string) {
        const filePath = await this.resolveSafePath(templateId, fileName);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { fileName, content };
        } catch {
            throw new NotFoundException({
                code: FILE_ERROR_CODES.NOT_FOUND,
                message: `${FILE_ERRORS[FILE_ERROR_CODES.NOT_FOUND]}: "${fileName}"`,
            });
        }
    }

    async writeFile(templateId: string, fileName: string, content: string, deviceId: string | null = null) {
        if (content == null) {
            throw new BadRequestException({
                code: FILE_ERROR_CODES.CONTENT_REQUIRED,
                message: FILE_ERRORS[FILE_ERROR_CODES.CONTENT_REQUIRED],
            });
        }

        const filePath = await this.resolveSafePath(templateId, fileName);
        const template = await this.templatesService.findById(templateId);

        try {
            await this.templateVersions.snapshotBeforeChange(templateId, template.path, deviceId);
            await fs.writeFile(filePath, content, 'utf-8');
            this.logger.log(`Saved file "${fileName}" for template "${templateId}"`);
            return { fileName, saved: true };
        } catch (error) {
            this.logger.error(
                `Failed to write file "${fileName}" for template "${templateId}"`,
                error instanceof Error ? error.stack : String(error),
            );
            throw new HttpException(
                {
                    code: FILE_ERROR_CODES.WRITE_FAILED,
                    message: FILE_ERRORS[FILE_ERROR_CODES.WRITE_FAILED],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
