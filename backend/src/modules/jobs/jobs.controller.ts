import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';
import { CreateJobDTO } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

// Diqqat: bu controller ilgari HECH QANDAY auth guard'siz edi — istalgan
// so'rov (login qilmasdan ham) boshqa userlarning barcha job'larini,
// shu jumladan args va loglarini ko'ra olardi, va istalgan appId'ga job
// yuborishi mumkin edi. Endi barcha endpoint JwtAuthGuard bilan himoyalangan
// va natijalar shu userga (yoki uning tashkilotiga) tegishli job'lar bilan
// cheklangan — qarang: JobsService/JobsRepository'dagi VISIBLE_TO_USER_CLAUSE.
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // script ishga tushirish — 1 daqiqada 10 tadan ko'p emas
  create(@CurrentUser() userId: string, @Body() body: CreateJobDTO) {
    return this.jobsService.enqueue(
      body.templateSlug,
      body.action,
      body.args ?? {},
      body.appId,
      userId,
    );
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.findAll(
      userId,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.jobsService.findOne(userId, id);
  }

  @Get(':id/logs')
  findLogs(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.jobsService.findLogs(userId, id);
  }
}
