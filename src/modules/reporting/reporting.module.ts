import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ReportingService } from './application/services/reporting.service';
import { ReportRegistryService } from './application/services/report-registry.service';
import { ReportJobsProvider } from './application/providers/bg-jobs/report-jobs.provider';
import { DMSModule } from '../shared/dms/dms.module';
import { CorrespondenceModule } from '../shared/correspondence/correspondence.module';
import { ReportingController } from './presentation/controllers/reporting.controller';
import { REPORT_REPOSITORY } from './domain/repositories/report.repository.interface';
import { ReportRepository } from './infrastructure/report.repository';
import { WorkflowModule } from '../workflow/workflow.module';
import { FirebaseModule } from '../shared/firebase/firebase.module';
import { ReportMetadataService } from './infrastructure/external/report-metadata.service';


@Module({
    controllers: [ReportingController],
    imports: [
        DiscoveryModule,
        DMSModule,
        CorrespondenceModule,
        WorkflowModule,
        FirebaseModule
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
    exports: [
        REPORT_REPOSITORY
    ],
})
export class ReportingModule { }
