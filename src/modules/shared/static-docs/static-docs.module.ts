import { Module } from "@nestjs/common";
import { FirebaseModule } from "../firebase/firebase.module";
import { StaticDocsService } from "./application/services/static-docs.service";
import { StaticDocsController } from "./presentation/controller/static-document.controller";

@Module({
    controllers: [StaticDocsController],
    imports: [FirebaseModule],
    providers: [
        StaticDocsService,
    ],
    exports: [
        StaticDocsService,
    ],
})
export class StaticDocsModule { }
