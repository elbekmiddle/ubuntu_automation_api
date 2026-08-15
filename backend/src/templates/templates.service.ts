import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleInit
} from '@nestjs/common';
import { promises as fs }                                                                                    from 'fs';
import * as path from 'path';
import { TemplatesRepository } from './templates.repository';
import { TemplateManifest } from './templates.types';
import {CreateTemplateDTO}                     from "./dto/create-template.dto";
import {TEMPLATE_ERROR_CODES, TEMPLATE_ERRORS} from "../config/errors/template-error-code";

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
        if (!rows[0]) {
            throw new NotFoundException({
                code: TEMPLATE_ERROR_CODES.NOT_FOUND,
                message: `${TEMPLATE_ERRORS[TEMPLATE_ERROR_CODES.NOT_FOUND]}: "${Id}"`,
            });
        }
        return rows[0];
    }
    async findBySlug(Slug: string) {
        const { rows } = await this.repo.findBySlug(Slug);
        if (!rows[0]) {
            throw new NotFoundException({
                code: TEMPLATE_ERROR_CODES.NOT_FOUND,
                message: `${TEMPLATE_ERRORS[TEMPLATE_ERROR_CODES.NOT_FOUND]}: "${Slug}"`,
            });
        }
        return rows[0];
    }
    async createTemplate(dto: CreateTemplateDTO) {
        // 1. Slug validation
        if (!NAME_RE.test(dto.slug)) {
            throw new BadRequestException({
                code: TEMPLATE_ERROR_CODES.INVALID_SLUG,
                message: TEMPLATE_ERRORS[TEMPLATE_ERROR_CODES.INVALID_SLUG],
            });
        }

        // 2. Name validation
        if (!dto.name?.trim()) {
            throw new BadRequestException({
                code: TEMPLATE_ERROR_CODES.NAME_REQUIRED,
                message: TEMPLATE_ERRORS[TEMPLATE_ERROR_CODES.NAME_REQUIRED],
            });
        }

        // 3. Actions validation
        if (!dto.actions?.length) {
            throw new BadRequestException({
                code: TEMPLATE_ERROR_CODES.ACTIONS_REQUIRED,
                message: TEMPLATE_ERRORS[TEMPLATE_ERROR_CODES.ACTIONS_REQUIRED],
            });
        }

        // 4. Validate every action
        for (const action of dto.actions) {
            if (!NAME_RE.test(action.name)) {
                throw new BadRequestException({
                    code: TEMPLATE_ERROR_CODES.INVALID_ACTION_NAME,
                    message: `${TEMPLATE_ERRORS[TEMPLATE_ERROR_CODES.INVALID_ACTION_NAME]}: "${action.name}"`,
                });
            }

            if (!action.script?.trim()) {
                throw new BadRequestException({
                    code: TEMPLATE_ERROR_CODES.ACTION_SCRIPT_REQUIRED,
                    message: `"${action.name}" uchun script bo'sh bo'lishi mumkin emas`,
                });
            }
        }

        // 5. Action names duplicate check
        const actionNames = dto.actions.map((action) => action.name);

        const uniqueActionNames = new Set(actionNames);

        if (uniqueActionNames.size !== actionNames.length) {
            throw new BadRequestException({
                code: TEMPLATE_ERROR_CODES.DUPLICATE_ACTION_NAME,
                message: TEMPLATE_ERRORS[
                    TEMPLATE_ERROR_CODES.DUPLICATE_ACTION_NAME
                    ],
            });
        }

        // 6. Template path
        const templatePath = path.join(
            this.storageRoot,
            dto.slug,
        );

        // 7. Check template already exists
        const exists = await fs
            .access(templatePath)
            .then(() => true)
            .catch(() => false);

        if (exists) {
            throw new BadRequestException({
                code: TEMPLATE_ERROR_CODES.ALREADY_EXISTS,
                message: `"${dto.slug}" template allaqachon mavjud`,
            });
        }

        try {
            // 8. Create template directory
            await fs.mkdir(templatePath, {
                recursive: true,
            });

            // 9. Create manifest
            const manifest: TemplateManifest = {
                slug: dto.slug,
                name: dto.name.trim(),
                description: dto.description?.trim() ?? '',
                actions: actionNames,
            };

            const manifestPath = path.join(
                templatePath,
                'template.json',
            );

            await fs.writeFile(
                manifestPath,
                JSON.stringify(manifest, null, 2),
                'utf-8',
            );

            // 10. Create action scripts
            for (const action of dto.actions) {
                const scriptPath = path.join(
                    templatePath,
                    `${action.name}.sh`,
                );

                const script = action.script.trimStart();

                const content = script.startsWith('#!')
                    ? script
                    : `#!/bin/bash\n${script}`;

                await fs.writeFile(
                    scriptPath,
                    content,
                    'utf-8',
                );

                // executable
                await fs.chmod(scriptPath, 0o755);
            }

            // 11. Save to database
            const result = await this.repo.upsert({
                slug: dto.slug,
                name: dto.name.trim(),
                description: dto.description?.trim() ?? null,
                path: templatePath,
                actions: manifest.actions,
            });

            this.logger.log(
                `Created template: ${dto.slug}`,
            );

            return result;

        } catch (error) {
            // Log real internal error
            this.logger.error(
                `Failed to create template "${dto.slug}"`,
                error instanceof Error
                    ? error.stack
                    : String(error),
            );

            // Cleanup filesystem if something failed
            try {
                await fs.rm(templatePath, {
                    recursive: true,
                    force: true,
                });

                this.logger.warn(
                    `Cleaned up failed template: ${dto.slug}`,
                );
            } catch (cleanupError) {
                this.logger.error(
                    `Failed to cleanup template "${dto.slug}"`,
                    cleanupError instanceof Error
                        ? cleanupError.stack
                        : String(cleanupError),
                );
            }

            throw new HttpException(
                {
                    code: TEMPLATE_ERROR_CODES.CREATE_FAILED,
                    message: TEMPLATE_ERRORS[
                        TEMPLATE_ERROR_CODES.CREATE_FAILED
                        ],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}