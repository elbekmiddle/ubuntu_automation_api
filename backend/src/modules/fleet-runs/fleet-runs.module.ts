import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TemplatesModule } from '../templates/templates.module';
import { AppsModule } from '../apps/apps.module';
import { JobsModule } from '../jobs/jobs.module';
import { FleetRunsController } from './fleet-runs.controller';
import { FleetRunsService } from './fleet-runs.service';
import { FleetRunsRepository } from './fleet-runs.repository';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    TemplatesModule,
    AppsModule,
    JobsModule,
  ],
  controllers: [FleetRunsController],
  providers: [FleetRunsService, FleetRunsRepository],
})
export class FleetRunsModule {}
