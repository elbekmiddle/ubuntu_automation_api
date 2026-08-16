import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { TemplatesModule } from './templates/templates.module';
import { JobsModule } from './jobs/jobs.module';
import { SystemModule } from './system/system.module';
import { FilesModule } from './files/files.module';
import { DevicesModule } from './devices/devices.module';
import { DeviceTrackingMiddleware } from './devices/device-tracking.middleware';
import { AuditModule } from './audit/audit.module';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';
import { SchedulesModule } from './schedules/schedules.module';
import { DistroConfigsModule } from './distro-configs/distro-configs.module';

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
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 daqiqa
        limit: 100, // odatiy so'rovlar uchun
      },
    ]),
    DevicesModule,
    AuditModule,
    TemplatesModule,
    JobsModule,
    SystemModule,
    FilesModule,
    SchedulesModule,
    DistroConfigsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DeviceTrackingMiddleware).forRoutes('*');
  }
}
