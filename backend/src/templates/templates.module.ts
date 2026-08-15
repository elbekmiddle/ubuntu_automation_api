import { Module } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { DatabaseModule } from '../database/database.module';
import { TemplatesRepository } from './templates.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    TemplatesService,
    TemplatesRepository,
  ],
  controllers: [
    TemplatesController,
  ],
  exports: [
    TemplatesService,
  ],
})
export class TemplatesModule {}