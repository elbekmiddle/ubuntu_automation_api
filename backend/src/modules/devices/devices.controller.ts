import { Controller, Get } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
    constructor(private readonly devices: DevicesService) {}

    @Get()
    findAll() {
        return this.devices.findAll();
    }

    @Get('active-count')
    async activeCount() {
        return { active: await this.devices.countActive(5) };
    }
}
