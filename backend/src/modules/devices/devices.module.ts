import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DeviceTrackingMiddleware } from './device-tracking.middleware';
import { DevicesController } from './devices.controller';
import {DatabaseModule} from "../../database/database.module";

@Module({
    imports: [DatabaseModule],
    controllers: [DevicesController],
    providers: [DevicesService, DeviceTrackingMiddleware],
    exports: [DevicesService, DeviceTrackingMiddleware],
})
export class DevicesModule {}
