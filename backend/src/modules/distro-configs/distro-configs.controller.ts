import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DistroConfigsService } from './distro-configs.service';

@Controller('distro-configs')
export class DistroConfigsController {
    constructor(private readonly distroConfigs: DistroConfigsService) {}

    @Get()
    list() {
        return this.distroConfigs.list();
    }

    @Get('backups')
    listBackups() {
        return this.distroConfigs.listBackups();
    }

    @Get(':id')
    read(@Param('id') id: string) {
        return this.distroConfigs.read(id);
    }

    @Post(':id/backup')
    backup(@Param('id') id: string, @Req() req: Request) {
        return this.distroConfigs.backup(id, req.deviceId ?? null);
    }
}
