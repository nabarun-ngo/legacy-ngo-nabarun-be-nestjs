import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IReportProvider, ReportGeneratedData, ReportProvider } from '../../../../reporting/domain/reporting.interface';
import { formatDate } from 'src/shared/utilities/common.util';
import { DateTime } from 'luxon';
import { DONATION_REPOSITORY, type IDonationRepository } from 'src/modules/finance/domain/repositories/donation.repository.interface';
import { EXPENSE_REPOSITORY, type IExpenseRepository } from 'src/modules/finance/domain/repositories/expense.repository.interface';
import { EARNING_REPOSITORY, type IEarningRepository } from 'src/modules/finance/domain/repositories/earning.repository.interface';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from 'src/modules/finance/domain/repositories/account.repository.interface';
import { DocumentGeneratorService } from 'src/modules/shared/document-generator/services/document-generator.service';
import { FieldDef } from 'src/shared/models/custom-field-def';
import { ExpenseStatus } from 'src/modules/finance/domain/model/expense.model';
import { EarningStatus } from 'src/modules/finance/domain/model/earning.model';
import { AccountStatus } from 'src/modules/finance/domain/model/account.model';
import { DonationStatus } from 'src/modules/finance/domain/model/donation.model';
import { MetadataService } from 'src/modules/finance/infrastructure/external/metadata.service';
import { groupBy } from 'lodash';

// Styling definitions
const thinBorder = {
    top: { style: 'thin' as const, color: '#D3D3D3' },
    bottom: { style: 'thin' as const, color: '#D3D3D3' },
    left: { style: 'thin' as const, color: '#D3D3D3' },
    right: { style: 'thin' as const, color: '#D3D3D3' },
};
const doubleBottomBorder = {
    top: { style: 'thin' as const, color: '#D3D3D3' },
    bottom: { style: 'double' as const, color: '#000000' },
    left: { style: 'thin' as const, color: '#D3D3D3' },
    right: { style: 'thin' as const, color: '#D3D3D3' },
};

const titleStyle = {
    font: { bold: true, size: 16, color: '#FFFFFF' },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
};

const subtitleStyle = {
    font: { bold: true, size: 11, color: '#1F4E78' },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#DDEBF7' },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
};

const sectionHeaderStyle = {
    font: { bold: true, size: 12, color: '#1F4E78' },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#DDEBF7' },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const labelStyle = {
    font: { bold: false, size: 11 },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const labelBoldStyle = {
    font: { bold: true, size: 11 },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const rupeeFmt = '₹ #,##0.00';

const amountStyle = {
    font: { bold: false, size: 11 },
    numFmt: rupeeFmt,
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const amountBoldStyle = {
    font: { bold: true, size: 11 },
    numFmt: rupeeFmt,
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const percentageStyle = {
    font: { bold: false, size: 11 },
    numFmt: '0.0%',
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const percentageBoldStyle = {
    font: { bold: true, size: 11 },
    numFmt: '0.0%',
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: thinBorder,
};

const totalRowLabelStyle = {
    font: { bold: true, size: 11, color: '#000000' },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F2F2F2' },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
    border: doubleBottomBorder,
};

const totalRowAmountStyle = {
    font: { bold: true, size: 11, color: '#000000' },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F2F2F2' },
    numFmt: rupeeFmt,
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: doubleBottomBorder,
};

const totalRowPercentageStyle = {
    ...totalRowAmountStyle,
    numFmt: '0.0%',
};

@Injectable()
@ReportProvider()
export class AuditReportProvider implements IReportProvider<{ financialYear: string }> {
    readonly reportCode = 'ANNUAL_AUDIT_REPORT';

    constructor(
        @Inject(DONATION_REPOSITORY)
        private readonly donationRepository: IDonationRepository,
        @Inject(EXPENSE_REPOSITORY)
        private readonly expenseRepository: IExpenseRepository,
        @Inject(EARNING_REPOSITORY)
        private readonly earningRepository: IEarningRepository,
        @Inject(ACCOUNT_REPOSITORY)
        private readonly accountRepository: IAccountRepository,
        private readonly documentGenerator: DocumentGeneratorService,
        private readonly metadataService: MetadataService,
    ) { }

    readonly reportParams: FieldDef<'financialYear'>[] = [
        {
            key: 'financialYear',
            defKey: 'INPUT_TEXT_FIELD',
            label: 'Financial Year (e.g. 2025-2026)',
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

        // Safe Date formatter helper
        const safeFormatDate = (date?: Date | null): string => {
            if (!date) return '-';
            try {
                return formatDate(date);
            } catch {
                return '-';
            }
        };

        // Load all financial data streams in parallel
        const [donations, expenses, earnings, accounts] = await Promise.all([
            this.donationRepository.findAll({
                startDate_raisedOn: startDate,
                endDate_raisedOn: endDate,
            }),
            this.expenseRepository.findAll({
                startDate: startDate,
                endDate: endDate,
            }),
            this.earningRepository.findAll({
                startDate: startDate,
                endDate: endDate,
            }),
            this.accountRepository.findAll({
                status: [AccountStatus.ACTIVE],
                includeBalance: true,
            }),
        ]);

        const refData = await this.metadataService.getReferenceData();
        const incomeMap: { label: string, value: number }[] = [];

        // Consolidated breakdown sums for Annual Summary sheet
        const paidDons = donations.filter(d => d.status === DonationStatus.PAID);
        incomeMap.push({ label: 'Member Donations (Regular + One Time)', value: paidDons.filter(f => !f.isGuest).reduce((sum, d) => sum + d.amount, 0) })
        incomeMap.push({ label: 'Guest Donations', value: paidDons.filter(f => f.isGuest).reduce((sum, d) => sum + d.amount, 0) })


        const receivedEarnings = earnings.filter(e => e.status === EarningStatus.RECEIVED);

        for (const cat of refData.earn_categories) {
            incomeMap.push({ label: `${cat.VALUE} Earnings`, value: receivedEarnings.filter(e => e.category === cat.KEY).reduce((sum, e) => sum + e.amount, 0) })
        }

        const settledExpenses = expenses.filter(e => e.status === ExpenseStatus.SETTLED);
        const expMap: { label: string, value: number }[] = [];

        for (const refType of refData.exp_categories) {
            expMap.push({ label: `${refType.VALUE} Expenses`, value: settledExpenses.filter(e => e.referenceType === refType.KEY).reduce((sum, e) => sum + e.amount, 0) })
        }

        const excelBuilder = this.documentGenerator.createExcelBuilder();

        // ==========================================
        // 1. SHEET: ANNUAL SUMMARY
        // ==========================================
        const summarySheet = excelBuilder.addSheet({
            name: 'Annual Summary',
            autoSizeColumns: false,
        });

        // Setup custom column widths
        summarySheet
            .setColumnWidth('A', 35)
            .setColumnWidth('B', 20)
            .setColumnWidth('C', 15);


        const incomeRowStart = 17;
        const incomeTotalRow = incomeRowStart + incomeMap.length;

        const expSectionHeaderRow = incomeTotalRow + 2;
        const expRowStart = expSectionHeaderRow + 2;
        const expTotalRow = expRowStart + expMap.length;

        // ── Letterhead (rows 1-4) ──────────────────────────────────────────────
        const data = summarySheet;

        const letterheadBg = { fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' } };
        const letterheadOrgStyle = {
            font: { bold: true, size: 20, color: '#FFFFFF', name: 'Calibri' },
            fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
            alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        };
        const letterheadTaglineStyle = {
            font: { bold: false, size: 11, color: '#BDD7EE', italic: true, name: 'Calibri' },
            fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
            alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        };
        const letterheadInfoStyle = {
            font: { bold: false, size: 9, color: '#DDEBF7', name: 'Calibri' },
            fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#1F4E78' },
            alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        };
        const letterheadDividerStyle = {
            fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: '#F4A623' },
        };

        data
            // Row 1: Organisation name
            .mergeCells(1, 1, 1, 3)
            .setRowHeight(1, 38)
            .setCell(1, 1, 'NABARUN', letterheadOrgStyle)

            // Row 2: Tagline
            .mergeCells(2, 1, 2, 3)
            .setRowHeight(2, 22)
            .setCell(2, 1, 'An Apolitical Socio-Cultural Organisation', letterheadTaglineStyle)

            // Row 3: Contact / registration line
            .mergeCells(3, 1, 3, 3)
            .setRowHeight(3, 18)
            .setCell(3, 1, 'Reg. No:   |  Email: nabarunbangla18@gmail.com  |  Website: https://ngonabarun.web.app', letterheadInfoStyle)

            // Row 4: Orange accent bar
            .mergeCells(4, 1, 4, 3)
            .setRowHeight(4, 4)
            .setCell(4, 1, '', letterheadDividerStyle)

            // ── Report Title Block (rows 5-8) ──────────────────────────────────
            // Row 5: empty spacer
            .mergeCells(5, 1, 5, 3)
            .setRowHeight(5, 8)

            .mergeCells(6, 1, 6, 3)
            .setRowHeight(6, 40)
            .setCell(6, 1, 'Annual Financial Audit Report', titleStyle)

            .mergeCells(7, 1, 7, 3)
            .setRowHeight(7, 22)
            .setCell(7, 1, `Financial Year: ${request.financialYear}`, subtitleStyle)

            .mergeCells(8, 1, 8, 3)
            .setRowHeight(8, 20)
            .setCell(8, 1, `Generated on: ${safeFormatDate(new Date())}`, {
                font: { italic: true, size: 9, color: '#595959' },
                alignment: { horizontal: 'center' as const },
            })

            // Section 1: Financial Health Overview
            .mergeCells(10, 1, 10, 3)
            .setCell(10, 1, 'Financial Overview', sectionHeaderStyle)
            .setCell(11, 1, 'Total Gross Income', labelBoldStyle)
            .addFormula(11, 2, `B${incomeTotalRow}`, amountBoldStyle)
            .setCell(11, 3, '-', amountStyle)
            .setCell(12, 1, 'Total Expenditures', labelBoldStyle)
            .addFormula(12, 2, `B${expTotalRow}`, amountBoldStyle)
            .setCell(12, 3, '-', amountStyle)
            .setCell(13, 1, 'Net Annual Surplus / (Deficit)', totalRowLabelStyle)
            .addFormula(13, 2, 'B11-B12', totalRowAmountStyle)
            .setCell(13, 3, '-', totalRowAmountStyle)

            // Section 2: Income Breakdown — row 15 onward (row 14 is spacer)
            .mergeCells(15, 1, 15, 3)
            .setCell(15, 1, 'Consolidated Income Breakdown', sectionHeaderStyle)
            .setCell(16, 1, 'Income Source', labelBoldStyle)
            .setCell(16, 2, 'Amount', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })
            .setCell(16, 3, '% of Income', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } });

        // NOTE: incomeRowStart is 17 — adjust to 13 because letterhead is only 4 rows now
        // (rows 1-4 letterhead, row 5 spacer, row 6-8 title block, row 9 spacer,
        //  row 10-13 overview, row 14 spacer, row 15-16 income header → incomeRowStart = 17)
        // Recalculate to match actual row 17:

        let incomeRow = incomeRowStart;
        for (const income of incomeMap) {
            data.setCell(incomeRow, 1, income.label, labelStyle)
            data.setCell(incomeRow, 2, income.value, amountStyle)
            data.addFormula(incomeRow, 3, `IFERROR(B${incomeRow}/B${incomeTotalRow}, 0)`, percentageStyle)
            incomeRow++;
        }


        data.setCell(incomeTotalRow, 1, 'Total Consolidated Income', totalRowLabelStyle)
            .addFormula(incomeTotalRow, 2, `SUM(B${incomeRowStart}:B${incomeTotalRow - 1})`, totalRowAmountStyle)
            .addFormula(incomeTotalRow, 3, `SUM(C${incomeRowStart}:C${incomeTotalRow - 1})`, totalRowPercentageStyle)

            // Section 3: Expenditures Breakdown
            .mergeCells(expSectionHeaderRow, 1, expSectionHeaderRow, 3)
            .setCell(expSectionHeaderRow, 1, 'Consolidated Expenditures Breakdown', sectionHeaderStyle)
            .setCell(expSectionHeaderRow + 1, 1, 'Expense Category', labelBoldStyle)
            .setCell(expSectionHeaderRow + 1, 2, 'Amount', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })
            .setCell(expSectionHeaderRow + 1, 3, '% of Expenditures', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })

        let expRow = expRowStart;
        for (const exp of expMap) {
            data.setCell(expRow, 1, exp.label, labelStyle)
            data.setCell(expRow, 2, exp.value, amountStyle)
            data.addFormula(expRow, 3, `IFERROR(B${expRow}/B${expTotalRow}, 0)`, percentageStyle)
            expRow++;
        }

        data.setCell(expTotalRow, 1, 'Total Consolidated Expenditures', totalRowLabelStyle)
            .addFormula(expTotalRow, 2, `SUM(B${expRowStart}:B${expTotalRow - 1})`, totalRowAmountStyle)
            .addFormula(expTotalRow, 3, `SUM(C${expRowStart}:C${expTotalRow - 1})`, totalRowPercentageStyle)

            .endSheet();

        // ==========================================
        // 2. SHEET: ACCOUNT SUMMARY
        // ==========================================
        const accTypeMap = new Map<string, string>();
        refData.acc_type.forEach(item => accTypeMap.set(item.KEY, item.VALUE));
        const accountRows = accounts.map(acc => ({
            accountId: acc.id,
            accountName: acc.name,
            accountType: accTypeMap.get(acc.type) || acc.type,
            status: acc.status,
            currency: acc.currency || 'INR',
            balance: acc.balance,
            description: acc.description || '-',
        }));

        excelBuilder.addSheet({
            name: 'Account Summary',
            freezePane: { row: 1 },
            autoFilter: true,
            columns: [
                { header: 'Account ID', key: 'accountId', width: 15 },
                { header: 'Account Name', key: 'accountName', width: 25 },
                { header: 'Account Type', key: 'accountType', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Closing Balance', key: 'balance', width: 18, style: { numFmt: rupeeFmt, alignment: { horizontal: 'right' as const } } },
                { header: 'Description', key: 'description', width: 35 },
            ],
        })
            .addRows(accountRows)
            .endSheet();

        // ==========================================
        // 3. SHEET: DONATIONS DETAILS
        // ==========================================
        const paymentMethodMap = new Map<string, string>();
        refData.paymentMethod.forEach(item => paymentMethodMap.set(item.KEY, item.VALUE));

        const upiTypeMap = new Map<string, string>();
        refData.upiOption.forEach(item => upiTypeMap.set(item.KEY, item.VALUE));

        const donationRows = donations.map(d => {
            const activityName = d.activityName || '-';
            return {
                donationId: d.id,
                donorName: d.donorName,
                donorEmail: d.donorEmail || '-',
                donorPhone: d.donorNumber || '-',
                amount: d.amount,
                currency: d.currency || 'INR',
                raisedOn: safeFormatDate(d.raisedOn),
                paidOn: safeFormatDate(d.paidOn),
                paymentMethod: paymentMethodMap.get(d.paymentMethod!) || d.paymentMethod || '-',
                paidUsingUPI: upiTypeMap.get(d.paidUsingUPI!) || d.paidUsingUPI || '-',
                transactionRef: d.transactionRef || '-',
                activityName: activityName,
                status: d.status,
                confirmedBy: d.confirmedBy?.fullName || '-',
                confirmedOn: safeFormatDate(d.confirmedOn),
                remarks: d.remarks || '-',
            };
        });

        excelBuilder.addSheet({
            name: 'Donations Details',
            freezePane: { row: 1 },
            autoFilter: true,
            columns: [
                { header: 'Donation ID', key: 'donationId', width: 15 },
                { header: 'Donor Name', key: 'donorName', width: 25 },
                { header: 'Email', key: 'donorEmail', width: 25 },
                { header: 'Phone', key: 'donorPhone', width: 15 },
                { header: 'Amount', key: 'amount', width: 15, style: { numFmt: rupeeFmt, alignment: { horizontal: 'right' as const } } },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Raised Date', key: 'raisedOn', width: 15 },
                { header: 'Paid Date', key: 'paidOn', width: 15 },
                { header: 'Payment Method', key: 'paymentMethod', width: 15 },
                { header: 'UPI Type', key: 'paidUsingUPI', width: 15 },
                { header: 'Transaction Ref', key: 'transactionRef', width: 20 },
                { header: 'Activity Name', key: 'activityName', width: 25 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Confirmed By', key: 'confirmedBy', width: 20 },
                { header: 'Confirmed On', key: 'confirmedOn', width: 15 },
                { header: 'Remarks', key: 'remarks', width: 30 },
            ],
        })
            .addRows(donationRows)
            .endSheet();

        // ==========================================
        // 4. SHEET: OTHER EARNINGS DETAILS
        // ==========================================
        const earningTypeMap = new Map<string, string>();
        refData.earn_categories.forEach(item => earningTypeMap.set(item.KEY, item.VALUE));

        const earningStatusMap = new Map<string, string>();
        refData.earn_status.forEach(item => earningStatusMap.set(item.KEY, item.VALUE));

        const earningRows = earnings.map(earn => ({
            earningId: earn.id,
            category: earningTypeMap.get(earn.category!) || earn.category || '-',
            amount: earn.amount,
            currency: earn.currency || 'INR',
            earningDate: safeFormatDate(earn.earningDate),
            source: earn.source || '-',
            description: earn.description || '-',
            status: earningStatusMap.get(earn.status!) || earn.status || '-',
            referenceId: earn.referenceId || '-',
        }));

        excelBuilder.addSheet({
            name: 'Earnings Details',
            freezePane: { row: 1 },
            autoFilter: true,
            columns: [
                { header: 'Earning ID', key: 'earningId', width: 15 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Amount', key: 'amount', width: 15, style: { numFmt: rupeeFmt, alignment: { horizontal: 'right' as const } } },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Earning Date', key: 'earningDate', width: 15 },
                { header: 'Source', key: 'source', width: 25 },
                { header: 'Description', key: 'description', width: 35 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Reference ID', key: 'referenceId', width: 20 },
            ],
        })
            .addRows(earningRows)
            .endSheet();

        // ==========================================
        // 5. SHEET: EXPENSES DETAILS
        // ==========================================
        const expenseTypeMap = new Map<string, string>();
        refData.exp_categories.forEach(item => expenseTypeMap.set(item.KEY, item.VALUE));

        const expenseStatusMap = new Map<string, string>();
        refData.exp_status.forEach(item => expenseStatusMap.set(item.KEY, item.VALUE));

        const expenseRows = expenses.map(e => {
            const activityName = e.activityName || '-';
            return {
                expenseId: e.id,
                name: e.name,
                activityName: activityName,
                category: expenseTypeMap.get(e.referenceType!) || e.referenceType || '-',
                amount: e.amount,
                currency: e.currency || 'INR',
                date: safeFormatDate(e.expenseDate),
                status: expenseStatusMap.get(e.status!) || e.status || '-',
                description: e.description || '-',
                requestedBy: e.requestedBy?.fullName || '-',
                paidBy: e.paidBy?.fullName || '-',
                settledOn: safeFormatDate(e.settledDate),
                remarks: e.remarks || '-',
            };
        });

        excelBuilder.addSheet({
            name: 'Expenses Details',
            freezePane: { row: 1 },
            autoFilter: true,
            columns: [
                { header: 'Expense ID', key: 'expenseId', width: 15 },
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Activity Name', key: 'activityName', width: 25 },
                { header: 'Category (Ref Type)', key: 'category', width: 20 },
                { header: 'Amount', key: 'amount', width: 15, style: { numFmt: rupeeFmt, alignment: { horizontal: 'right' as const } } },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Description', key: 'description', width: 35 },
                { header: 'Requested By', key: 'requestedBy', width: 20 },
                { header: 'Paid By', key: 'paidBy', width: 20 },
                { header: 'Settled Date', key: 'settledOn', width: 15 },
                { header: 'Remarks', key: 'remarks', width: 30 },
            ],
        })
            .addRows(expenseRows)
            .endSheet();

        return await excelBuilder.build();
    }
}
