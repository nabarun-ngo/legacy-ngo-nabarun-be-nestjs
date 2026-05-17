import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportRegistryService } from './report-registry.service';
import { DmsService } from 'src/modules/shared/dms/application/services/dms.service';
import { DocumentMappingRefType } from 'src/modules/shared/dms/domain/mapping.model';
import { type IReportRepository, REPORT_REPOSITORY } from '../../domain/repositories/report.repository.interface';
import { Report, ReportStatus } from '../../domain/models/report.model';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IReportProvider } from '../../domain/reporting.interface';
import { StartWorkflowUseCase } from 'src/modules/workflow/application/use-cases/start-workflow.use-case';
import { PagedResult } from 'src/shared/models/paged-result';
import { ReportCategoryDto, ReportDetailDto, ReportFilterDto } from '../dto/report.dto';
import { ReportMetadataService } from '../../infrastructure/external/report-metadata.service';
import { fieldAttributeDomainToDto, mapToAdditionalFields } from 'src/shared/utilities/additional-field.util';

@Injectable()
export class ReportingService {
    private readonly logger = new Logger(ReportingService.name);

    constructor(
        private readonly registry: ReportRegistryService,
        private readonly dmsService: DmsService,
        @Inject(REPORT_REPOSITORY)
        private readonly reportRepository: IReportRepository,
        private readonly eventBus: EventEmitter2,
        private readonly startWorkflowUseCase: StartWorkflowUseCase,
        private readonly metadataService: ReportMetadataService,
    ) { }

    async registeredReports(): Promise<ReportCategoryDto[]> {
        const reports = await this.metadataService.getReportDefinations();
        return reports
            .filter(report => report.isActive)
            .map(report => ReportCategoryDto.fromDomain(report));
    }

    async generateReport<T extends Record<string, any>>(reportCode: string, params: T, authUserId: string) {
        const provider = this.registry.getProvider(reportCode);
        if (!provider) {
            throw new NotFoundException(`Report provider for ${reportCode} not found`);
        }
        const defination = await this.metadataService.getReportDefination(reportCode);
        const generatedData = await provider.generate(params);


        const report = Report.create({
            reportCode,
            reportName: generatedData.fileName,
            requestedById: authUserId,
            parameters: params as Record<string, any>,
            needApproval: defination.requiresApproval,
            approvers: defination.approverRoles,
            viewers: defination.visibleToRoles,
        });
        await this.reportRepository.create(report);

        const result = await this.processAndSaveReportDocument(provider, report, generatedData, authUserId);
        return ReportDetailDto.fromDomain(result.report);
    }

    async regenerateReport(reportId: string, authUserId: string) {
        const report = await this.reportRepository.findById(reportId);
        if (!report) {
            throw new NotFoundException(`Report not found`);
        }

        if (report.status === ReportStatus.APPROVED) {
            throw new BadRequestException(`Report is already approved`);
        }
        const provider = this.registry.getProvider(report.reportCode);
        if (!provider) {
            throw new NotFoundException(`Report provider for ${report.reportCode} not found`);
        }
        const generatedData = await provider.generate(report.parameters ?? {});

        const result = await this.processAndSaveReportDocument(provider, report, generatedData, authUserId, true);
        return ReportDetailDto.fromDomain(result.report);
    }

    private async processAndSaveReportDocument(
        provider: IReportProvider,
        report: Report,
        generatedData: { buffer: Buffer; fileName: string; contentType: string },
        authUserId: string,
        isRegenerate: boolean = false,
    ) {
        const { buffer, fileName, contentType } = generatedData;

        // Upload to DMS and capture the document ID
        const doc = await this.dmsService.uploadFile({
            fileBase64: buffer.toString('base64'),
            filename: fileName,
            contentType: contentType,
            documentMapping: [
                {
                    entityId: report.id,
                    entityType: DocumentMappingRefType.REPORT,
                },
            ],
        }, authUserId);

        report.incrementVersion(doc.id);

        if (!isRegenerate) {
            if (report.needApproval) {
                console.error('authUserId', authUserId)
                const workflow = await this.startWorkflowUseCase.execute({
                    type: 'REPORT_REVIEW',
                    data: {
                        reportCode: report.reportCode,
                        reportId: report.id,
                        reportName: report.reportName,
                        roleNames: report.approvers?.join(',') || '',
                    },
                    requestedBy: authUserId,
                });
                report.workflowId = workflow.id;
            }
            else {
                report.markApproved(authUserId);
            }
        }
        await this.reportRepository.update(report.id, report);

        for (const event of report.domainEvents) {
            this.eventBus.emit(event.constructor.name, event);
        }

        return { buffer, fileName, contentType, report: report };
    }

    async approveReport(reportId: string, authUserId: string, userRoles: string[]) {
        const report = await this.reportRepository.findById(reportId);
        if (!report) {
            throw new NotFoundException(`Report not found`);
        }
        if (!report.needApproval) {
            throw new BadRequestException(`Report does not require approval`);
        }
        if (report.status === ReportStatus.APPROVED) {
            throw new BadRequestException(`Report is already approved`);
        }

        // Check if user has required roles for approval
        if (report.approvers && report.approvers.length > 0) {
            const hasApproverRole = userRoles.some(role => report.approvers?.includes(role));
            if (!hasApproverRole) {
                throw new BadRequestException(`You do not have the required role to approve this report. Required: ${report.approvers.join(', ')}`);
            }
        }

        report.markApproved(authUserId);
        await this.reportRepository.update(report.id, report);

        for (const event of report.domainEvents) {
            this.eventBus.emit(event.constructor.name, event);
        }

        return ReportDetailDto.fromDomain(report);
    }

    async findReports(
        reportCode: string,
        filter?: ReportFilterDto,
        pageIndex?: number,
        pageSize?: number,
    ): Promise<PagedResult<ReportDetailDto>> {
        const result = await this.reportRepository.findPaged({
            pageIndex: pageIndex,
            pageSize: pageSize,
            props: {
                ...filter,
                reportCode,
                status: filter?.status ? [filter.status] : undefined,
            },
        });

        return new PagedResult<ReportDetailDto>(
            result.content.map(r => ReportDetailDto.fromDomain(r)),
            result.totalSize,
            result.pageIndex,
            result.pageSize,
        );
    }

    async getReportInputFields(reportCode: string) {
        const additionalFieldDef = await this.metadataService.getAdditionalFieldDef();
        const provider = this.registry.getProvider(reportCode);
        if (!provider) {
            throw new NotFoundException(`Report provider for ${reportCode} not found`);
        }
        return provider.reportParams
            .map(m => mapToAdditionalFields(m, additionalFieldDef))
            .map(fieldAttributeDomainToDto);
    }

}