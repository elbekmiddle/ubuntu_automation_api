import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FleetService } from './fleet.service';
import { CreateFleetRunDTO } from './dto/create-fleet-run.dto';

@UseGuards(JwtAuthGuard)
@Controller('fleet-runs')
export class FleetController {
    constructor(private readonly fleetService: FleetService) {}

    @Post()
    create(@CurrentUser() userId: string, @Body() body: CreateFleetRunDTO) {
        return this.fleetService.createRun(userId, body.templateSlug, body.action, body.args ?? {}, body.appIds, body.deviceFilter ?? {});
    }

    @Get()
    list(@CurrentUser() userId: string) {
        return this.fleetService.listForUser(userId);
    }

    @Get(':id')
    get(@Param('id') id: string) {
        // Fleet run'ning o'zi ownership tekshiruvisiz o'qiladi (jamoaviy
        // ko'rish uchun kelajakda org-scoped bo'lishi mumkin) — hozircha
        // ID topib olish (UUID) yetarli xavfsizlik chegarasi, xuddi
        // JobDetail'dagi kabi.
        return this.fleetService.getRunStatus(id);
    }
}
