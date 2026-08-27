import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { JobsProcessor } from './jobs.processor';
import { TemplatesModule } from '../templates/templates.module';
import { DatabaseModule } from '../../database/database.module';
import { RedisPubSubService } from '../../redis/redis-pubsub.service';
import { AppsModule } from '../apps/apps.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: 'script-execution' }),
    TemplatesModule,
    forwardRef(() => AppsModule),
    AuthModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsRepository, JobsProcessor, RedisPubSubService],
  exports: [JobsService, JobsRepository, RedisPubSubService],
})
export class JobsModule {}
