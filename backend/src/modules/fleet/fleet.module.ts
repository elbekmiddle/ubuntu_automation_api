import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { FleetRepository } from './fleet.repository';
import { JobsModule } from '../jobs/jobs.module';
import { AppsModule } from '../apps/apps.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
    imports: [DatabaseModule, JobsModule, AppsModule, TemplatesModule],
    controllers: [FleetController],
    providers: [FleetService, FleetRepository],
    exports: [FleetService],
})
export class FleetModule {}
