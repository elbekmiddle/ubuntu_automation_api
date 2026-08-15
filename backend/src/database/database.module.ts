import {Module}        from "@nestjs/common";
import {DatabaseService} from "./database.service";


@Module({
    imports: [],
    controllers: [],
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule {

}