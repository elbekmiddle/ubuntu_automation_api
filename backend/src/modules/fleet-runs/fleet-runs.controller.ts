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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FleetRunsService } from './fleet-runs.service';
import { CreateFleetRunDTO } from './dto/create-fleet-run.dto';

@UseGuards(JwtAuthGuard)
@Controller('fleet-runs')
export class FleetRunsController {
  constructor(private readonly fleetRunsService: FleetRunsService) {}

  @Post()
  // Bitta fleet run o'nlab/yuzlab job yaratishi mumkin — shuning uchun
  // oddiy job yaratishdan (10/daqiqa) ancha qattiqroq cheklov.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@CurrentUser() userId: string, @Body() body: CreateFleetRunDTO) {
    return this.fleetRunsService.create(userId, body);
  }

  @Get()
  findAll(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fleetRunsService.findAllForUser(
      userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.fleetRunsService.findOneForUser(userId, id);
  }
}
