import { Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { TemplateVersionsService } from './template-versions.service';
import { TemplatesService } from './templates.service';

@Controller('templates/:id/versions')
export class TemplateVersionsController {
    constructor(
        private readonly versions: TemplateVersionsService,
        private readonly templatesService: TemplatesService,
    ) {}

    @Get()
    async list(@Param('id') id: string) {
        return this.versions.listVersions(id);
    }

    @Get(':version')
    async getOne(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
        return this.versions.getVersion(id, version);
    }

    @Post(':version/restore')
    async restore(
        @Param('id') id: string,
        @Param('version', ParseIntPipe) version: number,
        @Req() req: Request,
    ) {
        const template = await this.templatesService.findById(id);
        return this.versions.restore(id, template.path, version, req.deviceId ?? null);
    }
}
