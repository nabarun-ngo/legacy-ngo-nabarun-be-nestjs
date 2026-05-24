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
import { ExcelStyles } from 'src/modules/shared/document-generator/services/excel-builder.service';
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
        const password = crypto.randomUUID();
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
            protection: {
                sheet: true,
                password: password,
            },
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

        // ── Letterhead and Report Title Block ──────────────────────────────────
        const data = summarySheet;

        data.addReportHeader({
            title: 'Annual Financial Audit Report',
            subtitle: `Financial Year: ${request.financialYear}`,
            mergeColumns: 3,
            generationDate: new Date(),
        })

            // Section 1: Financial Health Overview
            .mergeCells(10, 1, 10, 3)
            .setCell(10, 1, 'Financial Overview', ExcelStyles.sectionHeaderStyle)
            .setCell(11, 1, 'Total Gross Income', ExcelStyles.labelBoldStyle)
            .addFormula(11, 2, `B${incomeTotalRow}`, ExcelStyles.rupeeAmountBoldStyle)
            .setCell(11, 3, '-', ExcelStyles.rupeeAmountStyle)
            .setCell(12, 1, 'Total Expenditures', ExcelStyles.labelBoldStyle)
            .addFormula(12, 2, `B${expTotalRow}`, ExcelStyles.rupeeAmountBoldStyle)
            .setCell(12, 3, '-', ExcelStyles.rupeeAmountStyle)
            .setCell(13, 1, 'Net Annual Surplus / (Deficit)', ExcelStyles.totalRowLabelStyle)
            .addFormula(13, 2, 'B11-B12', ExcelStyles.totalRowAmountStyle)
            .setCell(13, 3, '-', ExcelStyles.totalRowAmountStyle)

            // Section 2: Income Breakdown — row 15 onward (row 14 is spacer)
            .mergeCells(15, 1, 15, 3)
            .setCell(15, 1, 'Consolidated Income Breakdown', ExcelStyles.sectionHeaderStyle)
            .setCell(16, 1, 'Income Source', ExcelStyles.labelBoldStyle)
            .setCell(16, 2, 'Amount', { ...ExcelStyles.labelBoldStyle, alignment: { horizontal: 'right' as const } })
            .setCell(16, 3, '% of Income', { ...ExcelStyles.labelBoldStyle, alignment: { horizontal: 'right' as const } });



        let incomeRow = incomeRowStart;
        for (const income of incomeMap) {
            data.setCell(incomeRow, 1, income.label, ExcelStyles.labelStyle)
            data.setCell(incomeRow, 2, income.value, ExcelStyles.rupeeAmountStyle)
            data.addFormula(incomeRow, 3, `IFERROR(B${incomeRow}/B${incomeTotalRow}, 0)`, ExcelStyles.percentageReportStyle)
            incomeRow++;
        }


        data.setCell(incomeTotalRow, 1, 'Total Consolidated Income', ExcelStyles.totalRowLabelStyle)
            .addFormula(incomeTotalRow, 2, `SUM(B${incomeRowStart}:B${incomeTotalRow - 1})`, ExcelStyles.totalRowAmountStyle)
            .addFormula(incomeTotalRow, 3, `SUM(C${incomeRowStart}:C${incomeTotalRow - 1})`, ExcelStyles.totalRowPercentageStyle)

            // Section 3: Expenditures Breakdown
            .mergeCells(expSectionHeaderRow, 1, expSectionHeaderRow, 3)
            .setCell(expSectionHeaderRow, 1, 'Consolidated Expenditures Breakdown', ExcelStyles.sectionHeaderStyle)
            .setCell(expSectionHeaderRow + 1, 1, 'Expense Category', ExcelStyles.labelBoldStyle)
            .setCell(expSectionHeaderRow + 1, 2, 'Amount', { ...ExcelStyles.labelBoldStyle, alignment: { horizontal: 'right' as const } })
            .setCell(expSectionHeaderRow + 1, 3, '% of Expenditures', { ...ExcelStyles.labelBoldStyle, alignment: { horizontal: 'right' as const } })

        let expRow = expRowStart;
        for (const exp of expMap) {
            data.setCell(expRow, 1, exp.label, ExcelStyles.labelStyle)
            data.setCell(expRow, 2, exp.value, ExcelStyles.rupeeAmountStyle)
            data.addFormula(expRow, 3, `IFERROR(B${expRow}/B${expTotalRow}, 0)`, ExcelStyles.percentageReportStyle)
            expRow++;
        }

        data.setCell(expTotalRow, 1, 'Total Consolidated Expenditures', ExcelStyles.totalRowLabelStyle)
            .addFormula(expTotalRow, 2, `SUM(B${expRowStart}:B${expTotalRow - 1})`, ExcelStyles.totalRowAmountStyle)
            .addFormula(expTotalRow, 3, `SUM(C${expRowStart}:C${expTotalRow - 1})`, ExcelStyles.totalRowPercentageStyle)

            .endSheet();

        // ==========================================
        // 2. SHEET: ACCOUNT SUMMARY
        // ==========================================
        const accTypeMap = new Map<string, string>();
        refData.acc_type.forEach(item => accTypeMap.set(item.KEY, item.VALUE));
        const accountRows = accounts.map(acc => ({
            accountId: acc.id,
            accountName: acc.accountHolderName,
            accountType: accTypeMap.get(acc.type) || acc.type,
            status: acc.status,
            currency: acc.currency || 'INR',
            balance: acc.balance,
            activatedOn: safeFormatDate(acc.activatedOn) || '-',
        }));

        excelBuilder.addSheet({
            name: 'Account Summary',
            freezePane: { row: 1 },
            autoFilter: true,
            autoSizeColumns: true,
            protection: {
                sheet: true,
                password: password,
            },
            columns: [
                { header: 'Account ID', key: 'accountId' },
                { header: 'Account Name', key: 'accountName' },
                { header: 'Account Type', key: 'accountType' },
                { header: 'Status', key: 'status' },
                { header: 'Activated Date', key: 'activatedOn' },
                { header: 'Currency', key: 'currency' },
                { header: 'Closing Balance', key: 'balance', style: ExcelStyles.rupeeAmountStyle },
            ],
        })
            .addRows(accountRows)
            .endSheet();

        // ==========================================
        // 3. SHEET: DONATIONS DETAILS
        // ==========================================
        const donationTypeMap = new Map<string, string>();
        refData.donationType.forEach(item => donationTypeMap.set(item.KEY, item.VALUE));

        const donationStatusMap = new Map<string, string>();
        refData.donationStatus.forEach(item => donationStatusMap.set(item.KEY, item.VALUE));

        const paymentMethodMap = new Map<string, string>();
        refData.paymentMethod.forEach(item => paymentMethodMap.set(item.KEY, item.VALUE));

        const upiTypeMap = new Map<string, string>();
        refData.upiOption.forEach(item => upiTypeMap.set(item.KEY, item.VALUE));

        const donationRows = donations.map(d => {
            const activityName = d.activityName || '-';
            return {
                donationId: d.id,
                donationType: `${donationTypeMap.get(d.type) || d.type}${d.isGuest === true ? ' (Guest)' : ''}`,
                donorName: d.donorName,
                donorEmail: d.donorEmail || '-',
                donorPhone: d.donorNumber || '-',
                amount: d.amount,
                period: d.type == 'REGULAR' ? `${safeFormatDate(d.startDate)} - ${safeFormatDate(d.endDate)}` : "",
                currency: d.currency || 'INR',
                raisedOn: safeFormatDate(d.raisedOn),
                status: donationStatusMap.get(d.status) || d.status,
                paidOn: safeFormatDate(d.paidOn),
                paymentMethod: paymentMethodMap.get(d.paymentMethod ?? '') || d.paymentMethod || '-',
                paidUsingUPI: upiTypeMap.get(d.paidUsingUPI ?? '') || d.paidUsingUPI || '-',
                transactionRef: d.transactionRef || '-',
                activityName: activityName,
                confirmedBy: d.confirmedBy?.fullName || '-',
                confirmedOn: safeFormatDate(d.confirmedOn),
                remarks: d.remarks || '-',
            };
        });

        excelBuilder.addSheet({
            name: 'Donations Details',
            freezePane: { row: 1 },
            autoFilter: true,
            protection: {
                sheet: true,
                password: password,
            },
            columns: [
                { header: 'Donation ID', key: 'donationId', width: 15 },
                { header: 'Donation Type', key: 'donationType', width: 15 },
                { header: 'Donor Name', key: 'donorName', width: 25 },
                { header: 'Donor Email', key: 'donorEmail', width: 25 },
                { header: 'Donor Phone', key: 'donorPhone', width: 15 },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Donation Amount', key: 'amount', width: 15, style: ExcelStyles.rupeeAmountStyle },
                { header: 'Donation Period', key: 'period', width: 15 },
                { header: 'Raised Date', key: 'raisedOn', width: 15 },
                { header: 'Donation Status', key: 'status', width: 12 },
                { header: 'Paid Date', key: 'paidOn', width: 15 },
                { header: 'Payment Method', key: 'paymentMethod', width: 15 },
                { header: 'UPI Type', key: 'paidUsingUPI', width: 15 },
                { header: 'Transaction Ref', key: 'transactionRef', width: 20 },
                { header: 'Confirmed By', key: 'confirmedBy', width: 20 },
                { header: 'Confirmed Date', key: 'confirmedOn', width: 15 },
                { header: 'Activity Name', key: 'activityName', width: 25 },
                { header: 'Remarks', key: 'remarks', width: 25 },
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
            category: earningTypeMap.get(earn.category) || earn.category || '-',
            source: earn.source || '-',
            description: earn.description || '-',
            currency: earn.currency || 'INR',
            amount: earn.amount,
            status: earningStatusMap.get(earn.status) || earn.status || '-',
            accountId: earn.accountId || '-',
            transactionId: earn.transactionId || '-',
            earningDate: safeFormatDate(earn.earningDate),
            receivedBy: earn.receivedBy?.fullName || '-',
            createdBy: earn.createdBy?.fullName || '-',
            referenceId: earn.referenceId || '-',
        }));

        excelBuilder.addSheet({
            name: 'Earnings Details',
            freezePane: { row: 1 },
            autoFilter: true,
            protection: {
                sheet: true,
                password: password,
            },
            columns: [
                { header: 'Earning ID', key: 'earningId', width: 15 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Source', key: 'source', width: 25 },
                { header: 'Description', key: 'description', width: 35 },
                { header: 'Amount', key: 'amount', width: 15, style: ExcelStyles.rupeeAmountStyle },
                { header: 'Currency', key: 'currency', width: 10 },
                { header: 'Earning Date', key: 'earningDate', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Account ID', key: 'accountId', width: 15 },
                { header: 'Transaction ID', key: 'transactionId', width: 20 },
                { header: 'Received By', key: 'receivedBy', width: 20 },
                { header: 'Created By', key: 'createdBy', width: 20 },
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
                category: expenseTypeMap.get(e.referenceType ?? '') || e.referenceType || '-',
                name: e.name,
                description: e.description || '-',
                currency: e.currency || 'INR',
                amount: e.amount,
                status: expenseStatusMap.get(e.status) || e.status || '-',
                date: safeFormatDate(e.expenseDate),
                requestedBy: e.requestedBy?.fullName || '-',
                paidBy: e.paidBy?.fullName || '-',
                finalizedBy: e.finalizedBy?.fullName || '-',
                settledBy: e.settledBy?.fullName || '-',
                settledOn: safeFormatDate(e.settledDate),
                accountId: e.accountId || '-',
                transactionId: e.transactionId || '-',
                remarks: e.remarks || '-',
                activityName: activityName,
            };
        });

        excelBuilder.addSheet({
            name: 'Expenses Details',
            freezePane: { row: 1 },
            autoFilter: true,
            autoSizeColumns: true,
            protection: {
                sheet: true,
                password: password,
            },
            columns: [
                { header: 'Expense ID', key: 'expenseId' },
                { header: 'Expense Type', key: 'category' },
                { header: 'Name', key: 'name' },
                { header: 'Description', key: 'description' },
                { header: 'Currency', key: 'currency' },
                { header: 'Amount', key: 'amount', style: ExcelStyles.rupeeAmountStyle },
                { header: 'Status', key: 'status' },
                { header: 'Expense Date', key: 'date' },
                { header: 'Requested By', key: 'requestedBy' },
                { header: 'Paid By', key: 'paidBy' },
                { header: 'Finalized By', key: 'finalizedBy' },
                { header: 'Settled By', key: 'settledBy' },
                { header: 'Settled Date', key: 'settledOn' },
                { header: 'Account ID', key: 'accountId' },
                { header: 'Transaction ID', key: 'transactionId' },
                { header: 'Remarks', key: 'remarks' },
                { header: 'Activity Name', key: 'activityName' },
            ],
        })
            .addRows(expenseRows)
            .endSheet();

        return await excelBuilder.build();
    }
}
