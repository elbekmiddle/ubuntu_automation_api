import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppsService } from './apps.service';
import { CreateAppDTO } from './dto/create-app.dto';

@UseGuards(JwtAuthGuard)
@Controller('apps')
export class AppsController {
    constructor(private readonly appsService: AppsService) {}

    @Post()
    create(@CurrentUser() userId: string, @Body() body: CreateAppDTO) {
        return this.appsService.create(userId, body.name);
    }

    @Get()
    findAll(@CurrentUser() userId: string) {
        return this.appsService.findAllForUser(userId);
    }

    @Get(':id')
    findOne(@CurrentUser() userId: string, @Param('id') id: string) {
        return this.appsService.findOneForUser(userId, id);
    }

    @Delete(':id')
    remove(@CurrentUser() userId: string, @Param('id') id: string) {
        return this.appsService.remove(userId, id);
    }
}
