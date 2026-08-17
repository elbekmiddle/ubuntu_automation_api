import {Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards} from '@nestjs/common';
import type { Request } from 'express';
import {TemplatesService}             from "./templates.service";
import {CreateTemplateDTO}       from "./dto/create-template.dto";
import {SetVisibilityDTO} from "./dto/set-visibility.dto";
import {OptionalJwtGuard} from "../auth/optional-jwt.guard";
import {CurrentUser} from "../auth/current-user.decorator";

@Controller('templates')
export class TemplatesController {
    constructor(
        private readonly templatesService: TemplatesService,
    ) {}

    @Get()
    findAll(){
        return this.templatesService.findAll();
    }

    // /templates/public?q=... — jamoatchilikka ochiq templatelarni qidirish/ko'rish.
    // Aniq path bo'lgani uchun bu ':slug' route'idan OLDIN turishi kerak.
    @Get('public')
    findPublic(@Query('q') q?: string) {
        return this.templatesService.findPublic(q);
    }

    @Get(':slug')
    findOne(@Param('slug') slug: string) {
        return this.templatesService.findById(slug);
    }

    @UseGuards(OptionalJwtGuard)
    @Post()
    create(@Body() body: CreateTemplateDTO, @CurrentUser() userId?: string) {
        return this.templatesService.createTemplate(body, userId ?? null);
    }

    @Post('sync')
    sync() {
        return this.templatesService.syncFromDisk();
    }

    @UseGuards(OptionalJwtGuard)
    @Put(':id/visibility')
    setVisibility(
        @Param('id') id: string,
        @Body() body: SetVisibilityDTO,
        @CurrentUser() userId?: string,
    ) {
        return this.templatesService.setVisibility(id, body.isPublic, userId ?? null);
    }
}
