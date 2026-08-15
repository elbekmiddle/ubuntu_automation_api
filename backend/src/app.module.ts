import { Module } from '@nestjs/common';
import {DatabaseModule} from "./database/database.module";
import {ConfigModule} from "@nestjs/config";
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),DatabaseModule, TemplatesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
