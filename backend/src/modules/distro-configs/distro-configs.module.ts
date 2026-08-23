import { Module } from '@nestjs/common';
import { DistroConfigsService } from './distro-configs.service';
import { DistroConfigsController } from './distro-configs.controller';

@Module({
    controllers: [DistroConfigsController],
    providers: [DistroConfigsService],
})
export class DistroConfigsModule {}
