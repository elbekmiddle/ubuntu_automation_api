import { Controller, Get } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
    constructor(private readonly systemService: SystemService) {}

    @Get() getOverview() { return this.systemService.getOverview(); }
    @Get('cpu') getCpu() { return this.systemService.getCpu(); }
    @Get('memory') getMemory() { return this.systemService.getMemory(); }
    @Get('disk') getDisk() { return this.systemService.getDisk(); }
    @Get('network') getNetwork() { return this.systemService.getNetwork(); }
    @Get('processes') getProcesses() { return this.systemService.getProcesses(); }
    @Get('docker') getDocker() { return this.systemService.getDocker(); }
}