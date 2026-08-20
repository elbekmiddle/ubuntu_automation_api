import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { AppsRepository } from './apps.repository';
import { AgentsGateway } from './agents.gateway';
import { JobsModule } from '../jobs/jobs.module';

@Module({
    imports: [DatabaseModule, AuthModule, forwardRef(() => JobsModule)],
    controllers: [AppsController],
    providers: [AppsService, AppsRepository, AgentsGateway],
    exports: [AppsService, AgentsGateway],
})
export class AppsModule {}
