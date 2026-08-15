import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { TemplatesModule } from './templates/templates.module';
import { JobsModule } from './jobs/jobs.module';
import { SystemModule } from './system/system.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? '6379'),
      },
    }),
    TemplatesModule,
    JobsModule,
    SystemModule,
    FilesModule,
  ],
})
export class AppModule {}
