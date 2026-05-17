import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ReportProvider } from '../../../../reporting/domain/reporting.interface';
import { IReportProvider, ReportGeneratedData } from '../../../../reporting/domain/reporting.interface';
import { Role } from 'src/modules/user/domain/model/role.model';
import { ACTIVITY_REPOSITORY, type IActivityRepository } from '../../../domain/repositories/activity.repository.interface';
import { DocumentGeneratorService } from 'src/modules/shared/document-generator/services/document-generator.service';
import { FieldDef } from 'src/shared/models/custom-field-def';

@Injectable()
@ReportProvider()
export class ActivityReportProvider implements IReportProvider<{ activityId: string }> {
    readonly reportCode = 'ACTIVITY_REPORT';

    readonly reportParams: FieldDef<'activityId'>[] = [
        {
            key: 'activityId',
            defKey: 'INPUT_TEXT_FIELD',
            label: 'Activity ID',
            mandatory: true,
        },
    ];

    constructor(
        @Inject(ACTIVITY_REPOSITORY)
        private readonly activityRepository: IActivityRepository,
        private readonly documentGenerator: DocumentGeneratorService,
    ) { }

    async generate(params: { activityId: string }): Promise<ReportGeneratedData> {
        const buffer = await this.template({ activityId: params.activityId });

        return {
            buffer,
            fileName: `Activity_Report_${params.activityId}`,
            fileExtension: 'xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
    }


    private async template(request: { activityId: string }): Promise<Buffer> {
        const activity = await this.activityRepository.findById(request.activityId);
        if (!activity) {
            throw new NotFoundException(`Activity with ID ${request.activityId} not found`);
        }

        const subActivities = await this.activityRepository.findByParentActivityId(request.activityId);

        const excelBuilder = this.documentGenerator.createExcelBuilder();
        const sheet = excelBuilder.addSheet({
            name: 'Activity Report',
            autoSizeColumns: true,
        });

        const allborder: any = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' } };

        sheet
            .setCell(1, 1, 'Activity Summary Report', { font: { bold: true, size: 16 } })
            .setCell(3, 1, 'Basic Information', { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
            .setCell(4, 1, 'Name', { border: allborder }).setCell(4, 2, activity.name, { border: allborder })
            .setCell(5, 1, 'Type', { border: allborder }).setCell(5, 2, activity.type, { border: allborder })
            .setCell(6, 1, 'Scale', { border: allborder }).setCell(6, 2, activity.scale, { border: allborder })
            .setCell(7, 1, 'Status', { border: allborder }).setCell(7, 2, activity.status, { border: allborder })
            .setCell(8, 1, 'Priority', { border: allborder }).setCell(8, 2, activity.priority, { border: allborder })
            .setCell(9, 1, 'Venue', { border: allborder }).setCell(9, 2, activity.venue || 'N/A', { border: allborder })
            .setCell(10, 1, 'Location', { border: allborder }).setCell(10, 2, activity.location || 'N/A', { border: allborder })

            .setCell(12, 1, 'Participation & Metrics', { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
            .setCell(13, 1, 'Expected Participants', { border: allborder }).setCell(13, 2, activity.expectedParticipants || 0, { border: allborder })
            .setCell(14, 1, 'Actual Participants', { border: allborder }).setCell(14, 2, activity.actualParticipants || 0, { border: allborder })

            .setCell(16, 1, 'Cost Details', { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
            .setCell(17, 1, 'Estimated Cost', { border: allborder }).setCell(17, 2, activity.estimatedCost || 0, { numFmt: '₹ #,##0.00', border: allborder })
            .setCell(18, 1, 'Actual Cost', { border: allborder }).setCell(18, 2, activity.actualCost || 0, { numFmt: '₹ #,##0.00', border: allborder });

        if (subActivities.length > 0) {
            sheet
                .setCell(20, 1, 'Sub-Activities / Tasks', { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
                .setCell(21, 1, 'Name', { font: { bold: true }, border: allborder })
                .setCell(21, 2, 'Status', { font: { bold: true }, border: allborder })
                .setCell(21, 3, 'Type', { font: { bold: true }, border: allborder });

            let currentRow = 22;
            for (const sub of subActivities) {
                sheet
                    .setCell(currentRow, 1, sub.name, { border: allborder })
                    .setCell(currentRow, 2, sub.status, { border: allborder })
                    .setCell(currentRow, 3, sub.type, { border: allborder });
                currentRow++;
            }
        }

        return await excelBuilder.build();
    }
}
