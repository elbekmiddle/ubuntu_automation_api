import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDTO } from './dto/create-schedule.dto';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  findAll() {
    return this.schedules.findAll();
  }

  @Post()
  create(@Body() body: CreateScheduleDTO, @Req() req: Request) {
    return this.schedules.create(
      body.templateSlug,
      body.action,
      body.cron,
      body.args ?? {},
      req.deviceId ?? null,
    );
  }

  @Patch(':id/enabled')
  setEnabled(@Param('id') id: string, @Body() body: { enabled: boolean }) {
    return this.schedules.setEnabled(id, Boolean(body.enabled));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedules.remove(id);
  }
}
