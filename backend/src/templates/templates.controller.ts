import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import {TemplatesService}             from "./templates.service";
import {CreateTemplateDTO}       from "./dto/create-template.dto";

@Controller('templates')
export class TemplatesController {
    constructor(
        private readonly templatesService: TemplatesService,
    ) {}

    @Get()
    findAll(){
        return this.templatesService.findAll();
    }
    @Get(':slug')
    findOne(@Param('slug') slug: string) {
        return this.templatesService.findById(slug);
    }

    @Post()
    create(@Body() body: CreateTemplateDTO) {
        return this.templatesService.createTemplate(body);
    }

    @Post('sync')
    sync() {
        return this.templatesService.syncFromDisk();
    }
}
