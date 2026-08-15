import { Module } from '@nestjs/common';
import {DatabaseModule} from "./database/database.module";
import {ConfigModule} from "@nestjs/config";
import { TemplatesModule } from './templates/templates.module';
import {BullModule} from "@nestjs/bullmq";

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
})
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
