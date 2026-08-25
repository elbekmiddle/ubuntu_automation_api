import {forwardRef, Module} from '@nestjs/common';
import { DatabaseModule }    from '../../database/database.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './organizations.repository';
import { RolesGuard } from './roles.guard';
import {AuthModule} from "../auth/auth.module";

@Module({
    imports: [
        DatabaseModule,
        forwardRef(() => AuthModule),
    ],
    controllers: [OrganizationsController],
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
