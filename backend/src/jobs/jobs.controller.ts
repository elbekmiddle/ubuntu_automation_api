import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';
import { CreateJobDTO } from './dto/create-job.dto';

@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) {}

    @Post()
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // script ishga tushirish — 1 daqiqada 10 tadan ko'p emas
    create(@Body() body: CreateJobDTO) {
        return this.jobsService.enqueue(body.templateSlug, body.action, body.args ?? {});
    }

    @Get()
    findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
        return this.jobsService.findAll(Number(page) || 1, Number(limit) || 10);
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