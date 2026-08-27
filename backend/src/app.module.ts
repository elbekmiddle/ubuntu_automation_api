import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from './database/database.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SystemModule } from './modules/system/system.module';
import { FilesModule } from './modules/files/files.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DeviceTrackingMiddleware } from './modules/devices/device-tracking.middleware';
import { AuditModule } from './modules/audit/audit.module';
import { AuditLogInterceptor } from './modules/audit/audit-log.interceptor';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { DistroConfigsModule } from './modules/distro-configs/distro-configs.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppsModule } from './modules/apps/apps.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { FleetModule } from './modules/fleet/fleet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),

    DatabaseModule,

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? '6379'),
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    DevicesModule,
    AuditModule,
    AuthModule,
    TemplatesModule,
    JobsModule,
    SystemModule,
    FilesModule,
    SchedulesModule,
    DistroConfigsModule,
    AppsModule,
    OrganizationsModule,
    FleetModule,
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
