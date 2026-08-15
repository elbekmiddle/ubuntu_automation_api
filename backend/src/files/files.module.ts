import { Module } from '@nestjs/common';
import {TemplatesModule} from "../templates/templates.module";
import {FilesController} from "./files.controller";
import {FilesService} from "./files.service";

@Module({
    imports: [TemplatesModule],
    controllers: [FilesController],
    providers: [FilesService],
})
export class FilesModule {}
