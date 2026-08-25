import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppsService } from './apps.service';
import { CreateAppDTO } from './dto/create-app.dto';
import { DeviceSelectorDTO } from './dto/device-selector.dto';
import { SetTagsDTO } from './dto/set-tags.dto';

@UseGuards(JwtAuthGuard)
@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() body: CreateAppDTO) {
    return this.appsService.create(
      userId,
      body.name,
      body.permission,
      body.machineId,
    );
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.appsService.findAllForUser(userId);
  }

  /**
   * Target selector — fleet automation shu endpoint orqali "qaysi
   * device'larda ishga tushirilsin" ro'yxatini oladi (POST, chunki
   * selector — filtrlar massivi bilan — GET query string'ga qulay
   * sig'maydi). Bu hali faqat PREVIEW: haqiqiy "1000 ta mashinada
   * command bajarish" progress-bar bilan bajaruv logikasi (Jobs
   * modulini shu selector bilan bog'lash) navbatdagi bosqich.
   */
  @Post('select')
  select(@CurrentUser() userId: string, @Body() body: DeviceSelectorDTO) {
    return this.appsService.selectForUser(userId, body);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.appsService.findOneForUser(userId, id);
  }

  @Patch(':id/tags')
  setTags(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: SetTagsDTO,
  ) {
    return this.appsService.setTags(userId, id, body.tags);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.appsService.remove(userId, id);
  }
}
