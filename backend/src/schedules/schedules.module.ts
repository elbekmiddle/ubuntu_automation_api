import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { TemplatesModule } from '../templates/templates.module';
import { JobsModule } from '../jobs/jobs.module';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { ScheduleTriggerProcessor } from './schedule-trigger.processor';

@Module({
    imports: [
        DatabaseModule,
        TemplatesModule,
        JobsModule,
        BullModule.registerQueue({ name: 'schedule-trigger' }),
    ],
    controllers: [SchedulesController],
    providers: [SchedulesService, ScheduleTriggerProcessor],
})
export class SchedulesModule {}
