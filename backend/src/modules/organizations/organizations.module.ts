import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // <-- 1. Import qiling
import { DatabaseModule } from '../../database/database.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './organizations.repository';
import { RolesGuard } from './roles.guard';

@Module({
    imports: [
        DatabaseModule,
        JwtModule, // <-- 2. Shug'yerga qo'shing
    ],
    controllers: [
        OrganizationsController,
    ],
    providers: [
        OrganizationsService,
        OrganizationsRepository,
        RolesGuard,
    ],
    exports: [
        OrganizationsService,
        OrganizationsRepository,
    ],
})
export class OrganizationsModule {}