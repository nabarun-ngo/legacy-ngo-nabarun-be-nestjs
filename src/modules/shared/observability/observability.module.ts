import { HttpModule } from "@nestjs/axios";
import { Global,Module } from "@nestjs/common";
import { CorrespondenceModule } from "../correspondence/correspondence.module";
import { AppTechnicalErrorHandler } from "./application/handlers/app-technical-error.handler";
import { SlackAlertService } from "./infrastructure/external/slack-alert.service";

@Global()
@Module({
  imports: [HttpModule, CorrespondenceModule],
  providers: [SlackAlertService, AppTechnicalErrorHandler],
  exports: [],
})
export class ObservabilityModule {}
