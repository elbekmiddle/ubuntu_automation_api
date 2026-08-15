import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) {}

    @Post()
    create(@Body() body: { templateSlug: string; action: string; args?: Record<string, unknown> }) {
        return this.jobsService.enqueue(body.templateSlug, body.action, body.args ?? {});
    }

    @Get()
    findAll() {
        return this.jobsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.jobsService.findOne(id);
    }

    @Get(':id/logs')
    findLogs(@Param('id') id: string) {
        return this.jobsService.findLogs(id);
    }
}