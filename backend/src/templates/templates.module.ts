import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { DatabaseModule } from '../database/database.module';
import { TemplatesRepository } from './templates.repository';
import { TemplateVersionsService } from './template-versions.service';
import { TemplateVersionsController } from './template-versions.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [
    TemplatesService,
    TemplatesRepository,
    TemplateVersionsService,
  ],
  controllers: [
    TemplatesController,
    TemplateVersionsController,
  ],
  exports: [
    TemplatesService,
    TemplateVersionsService,
  ],
})
export class TemplatesModule {}
