import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { FilesService } from './files.service';
import { WriteFileDTO } from './dto/write-file.dto';

@Controller('templates/:id/files')
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    @Get()
    list(@Param('id') slug: string) {
        return this.filesService.listFiles(slug);
    }

    @Get(':fileName')
    read(@Param('id') slug: string, @Param('fileName') fileName: string) {
        return this.filesService.readFile(slug, fileName);
    }

    @Put(':fileName')
    write(
        @Param('id') slug: string,
        @Param('fileName') fileName: string,
        @Body() body: WriteFileDTO,
    ) {
        return this.filesService.writeFile(slug, fileName, body.content);
    }
}
