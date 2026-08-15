import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('templates/:slug/files')
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Get()
    list(@Param('slug') slug: string) {
        return this.filesService.listFiles(slug);
    }

    @Get(':fileName')
    read(@Param('slug') slug: string, @Param('fileName') fileName: string) {
        return this.filesService.readFile(slug, fileName);
    }

    @Put(':fileName')
    write(
        @Param('slug') slug: string,
        @Param('fileName') fileName: string,
        @Body() body: { content: string },
    ) {
        return this.filesService.writeFile(slug, fileName, body.content);
    }
}