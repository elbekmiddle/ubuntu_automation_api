import { Module } from '@nestjs/common';
import {TemplatesModule} from "../templates/templates.module";
import {FilesController} from "./files.controller";
import {FilesService} from "./files.service";
import {DatabaseModule} from "../../database/database.module";
import {TemplateVersionsService} from "../templates/template-versions.service";

@Module({
    imports: [TemplatesModule, DatabaseModule],
    controllers: [FilesController],
    providers: [FilesService, TemplateVersionsService],
})
export class FilesModule {}
