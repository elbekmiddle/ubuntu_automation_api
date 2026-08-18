import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { AppsRepository } from './apps.repository';
import { AgentsGateway } from './agents.gateway';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [AppsController],
    providers: [AppsService, AppsRepository, AgentsGateway],
    exports: [AppsService],
})
export class AppsModule {}
