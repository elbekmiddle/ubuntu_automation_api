import {
    Controller,
    Get,
    Param,
} from '@nestjs/common';

import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
    constructor(
        private readonly systemService: SystemService,
    ) {}

    @Get()
    getOverview() {
        return this.systemService.getOverview();
    }

    @Get('cpu')
    getCpu() {
        return this.systemService.getCpu();
    }

    @Get('memory')
    getMemory() {
        return this.systemService.getMemory();
    }

    @Get('disk')
    getDisk() {
        return this.systemService.getDisk();
    }

    @Get('network')
    getNetwork() {
        return this.systemService.getNetwork();
    }

    @Get('processes')
    getProcesses() {
        return this.systemService.getProcesses();
    }

    @Get('processes/:pid')
    getProcess(@Param('pid') pid: string) {
        return this.systemService.getProcess(
            Number(pid),
        );
    }

    @Get('docker')
    getDocker() {
        return this.systemService.getDocker();
    }

    @Get('os')
    getOsInfo() {
        return this.systemService.getOsInfo();
    }

    @Get('ports')
    getPorts() {
        return this.systemService.getPorts();
    }

    @Get('uptime')
    getUptime() {
        return this.systemService.getUptime();
    }

}