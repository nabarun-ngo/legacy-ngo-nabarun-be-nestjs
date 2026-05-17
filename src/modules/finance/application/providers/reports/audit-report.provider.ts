import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IReportProvider, ReportGeneratedData, ReportProvider } from '../../../../reporting/domain/reporting.interface';
import { formatDate } from 'src/shared/utilities/common.util';
import { DateTime } from 'luxon';
import { DONATION_REPOSITORY, type IDonationRepository } from 'src/modules/finance/domain/repositories/donation.repository.interface';
import { EXPENSE_REPOSITORY, type IExpenseRepository } from 'src/modules/finance/domain/repositories/expense.repository.interface';
import { DocumentGeneratorService } from 'src/modules/shared/document-generator/services/document-generator.service';
import { FieldDef } from 'src/shared/models/custom-field-def';

@Injectable()
@ReportProvider()
export class AuditReportProvider implements IReportProvider<{ financialYear: string }> {
    readonly reportCode = 'ANNUAL_AUDIT_REPORT';

    constructor(
        @Inject(DONATION_REPOSITORY)
        private readonly donationRepository: IDonationRepository,
        @Inject(EXPENSE_REPOSITORY)
        private readonly expenseRepository: IExpenseRepository,
        private readonly documentGenerator: DocumentGeneratorService,
    ) { }
    readonly reportParams: FieldDef<'financialYear'>[] = [
        {
            key: 'financialYear',
            defKey: 'INPUT_NUMBER_FIELD',
            label: 'Financial Year',
            mandatory: true,
        },
    ];
    async generate(params: { financialYear: string }): Promise<ReportGeneratedData> {
        const financialYear = params.financialYear;
        const buffer = await this.template({ financialYear });

        return {
            buffer,
            fileName: `Annual_Audit_Report_FY_${params.financialYear}`,
            fileExtension: 'xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
    }



    private async template(request: { financialYear: string }): Promise<Buffer> {
        if (!/^\d{4}-\d{4}$/.test(request.financialYear)) {
            throw new BadRequestException('Invalid financial year format. Expected format is YYYY-YYYY (e.g., 2025-2026).');
        }
        const [startYear, endYear] = request.financialYear.split('-').map(y => parseInt(y));
        const startDate = DateTime.fromObject({ year: startYear, month: 4, day: 1 }).toJSDate();
        const endDate = DateTime.fromObject({ year: endYear, month: 3, day: 31 }).endOf('day').toJSDate();

        const donations = await this.donationRepository.findAll({
            startDate_paidOn: startDate,
            endDate_paidOn: endDate,
        });

        const expenses = await this.expenseRepository.findAll({
            startDate: startDate,
            endDate: endDate
        });

        const excelBuilder = this.documentGenerator.createExcelBuilder();
        const summarySheet = excelBuilder.addSheet({
            name: 'Annual Summary',
            autoSizeColumns: true,
        });

        const allborder: any = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' } };

        const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        summarySheet
            .setCell(1, 1, `Annual Audit Report - FY ${request.financialYear}`, { font: { bold: true, size: 16 } })
            .setCell(3, 1, 'Financial Highlights', { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
            .setCell(4, 1, 'Total Income (Donations)', { border: allborder }).setCell(4, 2, totalDonations, { numFmt: '₹ #,##0.00', border: allborder })
            .setCell(5, 1, 'Total Expenditure', { border: allborder }).setCell(5, 2, totalExpenses, { numFmt: '₹ #,##0.00', border: allborder })
            .setCell(6, 1, 'Net Surplus/Deficit', { border: allborder }).setCell(6, 2, totalDonations - totalExpenses, { numFmt: '₹ #,##0.00', border: allborder });

        summarySheet.endSheet()
            .addSheet({
                name: 'Donations List',
                freezePane: { row: 1 },
                columns: [
                    { header: 'Donor Name', key: 'donorName', width: 25 },
                    { header: 'Amount', key: 'amount', width: 15 },
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Type', key: 'type', width: 15 },
                ]
            })
            .addRows(donations.map(d => ({
                donorName: d.donorName,
                amount: d.amount,
                date: formatDate(d.confirmedOn!),
                type: d.type,
            })))
            .endSheet()
            .addSheet({
                name: 'Expenses List',
                freezePane: { row: 1 },
                columns: [
                    { header: 'Category', key: 'category', width: 20 },
                    { header: 'Amount', key: 'amount', width: 15 },
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Description', key: 'description', width: 40 },
                ]
            })
            .addRows(expenses.map(e => ({
                category: e.referenceType,
                amount: e.amount,
                date: formatDate(e.createdAt),
                description: e.description,
            })))
            .endSheet();

        return await excelBuilder.build();
    }
}
