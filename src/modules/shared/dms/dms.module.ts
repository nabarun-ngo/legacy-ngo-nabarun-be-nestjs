import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { FirebaseModule } from "../firebase/firebase.module";
import { DmsService } from "./application/services/dms.service";
import { DOCUMENT_REPOSITORY } from "./domain/document.repository.interface";
import { DocumentRepository } from "./infrastructure/document.repository";
import { DmsController } from "./presentation/controller/dms.controller";

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
  exports: [DmsService],
})
export class DMSModule {}
