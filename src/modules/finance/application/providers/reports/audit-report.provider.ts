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

        // Consolidated breakdown sums for Annual Summary sheet
        const paidDons = donations.filter(d => d.status === DonationStatus.PAID);
        const regDonAmt = paidDons.filter(d => d.type === 'REGULAR').reduce((sum, d) => sum + d.amount, 0);
        const oneTimeDonAmt = paidDons.filter(d => d.type === 'ONETIME').reduce((sum, d) => sum + d.amount, 0);

        const receivedEarnings = earnings.filter(e => e.status === EarningStatus.RECEIVED);
        const serviceEarnAmt = receivedEarnings.filter(e => e.category === 'SERVICE').reduce((sum, e) => sum + e.amount, 0);
        const productEarnAmt = receivedEarnings.filter(e => e.category === 'PRODUCT').reduce((sum, e) => sum + e.amount, 0);
        const grantEarnAmt = receivedEarnings.filter(e => e.category === 'GRANT').reduce((sum, e) => sum + e.amount, 0);
        const sponsEarnAmt = receivedEarnings.filter(e => e.category === 'SPONSORSHIP').reduce((sum, e) => sum + e.amount, 0);
        const otherEarnAmt = receivedEarnings.filter(e => e.category === 'OTHER').reduce((sum, e) => sum + e.amount, 0);

        const settledExpenses = expenses.filter(e => e.status === ExpenseStatus.SETTLED);
        const opExpAmt = settledExpenses.filter(e => e.referenceType === 'OPERATIONAL').reduce((sum, e) => sum + e.amount, 0);
        const adminExpAmt = settledExpenses.filter(e => e.referenceType === 'ADMINISTRATIVE').reduce((sum, e) => sum + e.amount, 0);
        const eventExpAmt = settledExpenses.filter(e => e.referenceType === 'EVENT').reduce((sum, e) => sum + e.amount, 0);
        const adhocExpAmt = settledExpenses.filter(e => e.referenceType === 'ADHOC').reduce((sum, e) => sum + e.amount, 0);
        const otherExpAmt = settledExpenses.filter(e => !['OPERATIONAL', 'ADMINISTRATIVE', 'EVENT', 'ADHOC'].includes(e.referenceType || '')).reduce((sum, e) => sum + e.amount, 0);

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

        // Title Block
        summarySheet
            .mergeCells(1, 1, 1, 3)
            .setRowHeight(1, 40)
            .setCell(1, 1, 'Annual Financial Audit Report', titleStyle)

            .mergeCells(2, 1, 2, 3)
            .setRowHeight(2, 22)
            .setCell(2, 1, `Financial Year: ${request.financialYear}`, subtitleStyle)

            .mergeCells(3, 1, 3, 3)
            .setRowHeight(3, 20)
            .setCell(3, 1, `Generated on: ${safeFormatDate(new Date())}`, {
                font: { italic: true, size: 9, color: '#595959' },
                alignment: { horizontal: 'center' as const },
            })

            // Section 1: Financial Health Overview
            .mergeCells(5, 1, 5, 3)
            .setCell(5, 1, 'Financial Health Overview', sectionHeaderStyle)
            .setCell(6, 1, 'Total Gross Income', labelBoldStyle)
            .addFormula(6, 2, 'B19', amountBoldStyle)
            .setCell(6, 3, '-', amountStyle)
            .setCell(7, 1, 'Total Expenditures', labelBoldStyle)
            .addFormula(7, 2, 'B28', amountBoldStyle)
            .setCell(7, 3, '-', amountStyle)
            .setCell(8, 1, 'Net Annual Surplus / (Deficit)', totalRowLabelStyle)
            .addFormula(8, 2, 'B6-B7', totalRowAmountStyle)
            .setCell(8, 3, '-', totalRowAmountStyle)

            // Section 2: Income Breakdown
            .mergeCells(10, 1, 10, 3)
            .setCell(10, 1, 'Consolidated Income Breakdown', sectionHeaderStyle)
            .setCell(11, 1, 'Income Source', labelBoldStyle)
            .setCell(11, 2, 'Amount', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })
            .setCell(11, 3, '% of Income', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })

            .setCell(12, 1, 'Regular Donations', labelStyle)
            .setCell(12, 2, regDonAmt, amountStyle)
            .addFormula(12, 3, 'IFERROR(B12/B19, 0)', percentageStyle)

            .setCell(13, 1, 'One-Time Donations', labelStyle)
            .setCell(13, 2, oneTimeDonAmt, amountStyle)
            .addFormula(13, 3, 'IFERROR(B13/B19, 0)', percentageStyle)

            .setCell(14, 1, 'Service Earnings', labelStyle)
            .setCell(14, 2, serviceEarnAmt, amountStyle)
            .addFormula(14, 3, 'IFERROR(B14/B19, 0)', percentageStyle)

            .setCell(15, 1, 'Product Sales', labelStyle)
            .setCell(15, 2, productEarnAmt, amountStyle)
            .addFormula(15, 3, 'IFERROR(B15/B19, 0)', percentageStyle)

            .setCell(16, 1, 'Grants Received', labelStyle)
            .setCell(16, 2, grantEarnAmt, amountStyle)
            .addFormula(16, 3, 'IFERROR(B16/B19, 0)', percentageStyle)

            .setCell(17, 1, 'Corporate Sponsorships', labelStyle)
            .setCell(17, 2, sponsEarnAmt, amountStyle)
            .addFormula(17, 3, 'IFERROR(B17/B19, 0)', percentageStyle)

            .setCell(18, 1, 'Other Income', labelStyle)
            .setCell(18, 2, otherEarnAmt, amountStyle)
            .addFormula(18, 3, 'IFERROR(B18/B19, 0)', percentageStyle)

            .setCell(19, 1, 'Total Consolidated Income', totalRowLabelStyle)
            .addFormula(19, 2, 'SUM(B12:B18)', totalRowAmountStyle)
            .addFormula(19, 3, 'SUM(C12:C18)', totalRowPercentageStyle)

            // Section 3: Expenditures Breakdown
            .mergeCells(21, 1, 21, 3)
            .setCell(21, 1, 'Consolidated Expenditures Breakdown', sectionHeaderStyle)
            .setCell(22, 1, 'Expense Category', labelBoldStyle)
            .setCell(22, 2, 'Amount', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })
            .setCell(22, 3, '% of Expenditures', { ...labelBoldStyle, alignment: { horizontal: 'right' as const } })

            .setCell(23, 1, 'Operational Expenses', labelStyle)
            .setCell(23, 2, opExpAmt, amountStyle)
            .addFormula(23, 3, 'IFERROR(B23/B28, 0)', percentageStyle)

            .setCell(24, 1, 'Administrative Expenses', labelStyle)
            .setCell(24, 2, adminExpAmt, amountStyle)
            .addFormula(24, 3, 'IFERROR(B24/B28, 0)', percentageStyle)

            .setCell(25, 1, 'Event Expenses', labelStyle)
            .setCell(25, 2, eventExpAmt, amountStyle)
            .addFormula(25, 3, 'IFERROR(B25/B28, 0)', percentageStyle)

            .setCell(26, 1, 'Ad-hoc Expenses', labelStyle)
            .setCell(26, 2, adhocExpAmt, amountStyle)
            .addFormula(26, 3, 'IFERROR(B26/B28, 0)', percentageStyle)

            .setCell(27, 1, 'Other Miscellaneous Expenses', labelStyle)
            .setCell(27, 2, otherExpAmt, amountStyle)
            .addFormula(27, 3, 'IFERROR(B27/B28, 0)', percentageStyle)

            .setCell(28, 1, 'Total Consolidated Expenditures', totalRowLabelStyle)
            .addFormula(28, 2, 'SUM(B23:B27)', totalRowAmountStyle)
            .addFormula(28, 3, 'SUM(C23:C27)', totalRowPercentageStyle)
            .endSheet();

        // ==========================================
        // 2. SHEET: ACCOUNT SUMMARY
        // ==========================================
        const accountRows = accounts.map(acc => ({
            accountId: acc.id,
            accountName: acc.name,
            accountType: acc.type,
            status: acc.status,
            currency: acc.currency || 'INR',
            balance: acc.balance,
            description: acc.description || '-',
        }));

        excelBuilder.addSheet({
            name: 'Active Account Summary',
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
                paymentMethod: d.paymentMethod || '-',
                paidUsingUPI: d.paidUsingUPI || '-',
                transactionRef: d.transactionRef || '-',
                activityName: activityName,
                status: d.status,
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
                { header: 'Remarks', key: 'remarks', width: 30 },
            ],
        })
            .addRows(donationRows)
            .endSheet();

        // ==========================================
        // 4. SHEET: OTHER EARNINGS DETAILS
        // ==========================================
        const earningRows = earnings.map(earn => ({
            earningId: earn.id,
            category: earn.category,
            amount: earn.amount,
            currency: earn.currency || 'INR',
            earningDate: safeFormatDate(earn.earningDate),
            receivedDate: safeFormatDate(earn.receivedDate),
            source: earn.source || '-',
            description: earn.description || '-',
            status: earn.status,
            referenceId: earn.referenceId || '-',
        }));

        excelBuilder.addSheet({
            name: 'Other Earnings Details',
            freezePane: { row: 1 },
            autoFilter: true,
            columns: [
                { header: 'Earning ID', key: 'earningId', width: 15 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Amount', key: 'amount', width: 15, style: { numFmt: rupeeFmt, alignment: { horizontal: 'right' as const } } },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Earning Date', key: 'earningDate', width: 15 },
                { header: 'Received Date', key: 'receivedDate', width: 15 },
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
        const expenseRows = expenses.map(e => {
            const activityName = e.activityName || '-';
            return {
                expenseId: e.id,
                name: e.name,
                activityName: activityName,
                category: e.referenceType || '-',
                amount: e.amount,
                currency: e.currency || 'INR',
                date: safeFormatDate(e.expenseDate),
                status: e.status,
                description: e.description || '-',
                requestedBy: e.requestedBy?.id || '-',
                paidBy: e.paidBy?.id || '-',
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
