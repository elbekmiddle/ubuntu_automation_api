import { Module } from '@nestjs/common';
import {DatabaseModule} from "./database/database.module";
import {ConfigModule} from "@nestjs/config";
import { TemplatesModule } from './templates/templates.module';
import {BullModule} from "@nestjs/bullmq";
import { JobsModule } from './jobs/jobs.module';
import { SystemModule } from './system/system.module';
import { FilesService } from './files/files.service';
import { FilesController } from './files/files.controller';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
      ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TemplatesModule,
      BullModule.forRoot({
    connection: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? '6379'),
    }
}),
      JobsModule,
      SystemModule,
      FilesModule
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class AppModule {}
