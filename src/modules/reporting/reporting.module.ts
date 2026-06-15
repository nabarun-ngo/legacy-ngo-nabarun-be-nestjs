import { Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { CorrespondenceModule } from "../shared/correspondence/correspondence.module";
import { DMSModule } from "../shared/dms/dms.module";
import { FirebaseModule } from "../shared/firebase/firebase.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { ReportJobsProvider } from "./application/providers/bg-jobs/report-jobs.provider";
import { ReportRegistryService } from "./application/services/report-registry.service";
import { ReportingService } from "./application/services/reporting.service";
import { REPORT_REPOSITORY } from "./domain/repositories/report.repository.interface";
import { ReportMetadataService } from "./infrastructure/external/report-metadata.service";
import { ReportRepository } from "./infrastructure/report.repository";
import { ReportingController } from "./presentation/controllers/reporting.controller";

@Module({
  controllers: [ReportingController],
  imports: [
    DiscoveryModule,
    DMSModule,
    CorrespondenceModule,
    WorkflowModule,
    FirebaseModule,
  ],
  providers: [
    ReportingService,
    ReportRegistryService,
    ReportMetadataService,
    ReportJobsProvider,
    {
      provide: REPORT_REPOSITORY,
      useClass: ReportRepository,
    },
  ],
  exports: [],
})
export class ReportingModule {}
