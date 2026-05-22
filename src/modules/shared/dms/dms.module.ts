import { Module } from "@nestjs/common";
import { FirebaseModule } from "../firebase/firebase.module";
import { DocumentRepository } from "./infrastructure/document.repository";
import { DmsService } from "./application/services/dms.service";
import { DOCUMENT_REPOSITORY } from "./domain/document.repository.interface";
import { DmsController } from "./presentation/controller/dms.controller";
import { HttpModule } from "@nestjs/axios";

@Module({
    controllers: [DmsController],
    imports: [FirebaseModule, HttpModule],
    providers: [
        DmsService,
        {
            provide: DOCUMENT_REPOSITORY,
            useClass: DocumentRepository,
        },
    ],
    exports: [
        DmsService,
    ],
})
export class DMSModule { }