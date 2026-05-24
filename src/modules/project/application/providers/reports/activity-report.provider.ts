import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ReportProvider } from '../../../../reporting/domain/reporting.interface';
import { IReportProvider, ReportGeneratedData } from '../../../../reporting/domain/reporting.interface';
import { ACTIVITY_REPOSITORY, type IActivityRepository } from '../../../domain/repositories/activity.repository.interface';
import { DocumentGeneratorService } from 'src/modules/shared/document-generator/services/document-generator.service';
import { FieldDef } from 'src/shared/models/custom-field-def';
import { Activity } from 'src/modules/project/domain/model/activity.model';
import { ExcelStyles } from 'src/modules/shared/document-generator/services/excel-builder.service';
import { EXPENSE_REPOSITORY, type IExpenseRepository } from 'src/modules/finance/domain/repositories/expense.repository.interface';
import { DONATION_REPOSITORY, type IDonationRepository } from 'src/modules/finance/domain/repositories/donation.repository.interface';
import { ExpenseStatus } from 'src/modules/finance/domain/model/expense.model';
import { DonationStatus } from 'src/modules/finance/domain/model/donation.model';
import { formatDate } from 'src/shared/utilities/common.util';

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
        @Inject(EXPENSE_REPOSITORY)
        private readonly expenseRepository: IExpenseRepository,
        @Inject(DONATION_REPOSITORY)
        private readonly donationRepository: IDonationRepository,
        private readonly documentGenerator: DocumentGeneratorService,
    ) { }

    async generate(params: { activityId: string }): Promise<ReportGeneratedData> {
        const activity = await this.activityRepository.findById(params.activityId);
        if (!activity) {
            throw new NotFoundException(`Activity with ID ${params.activityId} not found`);
        }
        const buffer = await this.template({ activity });

        return {
            buffer,
            fileName: `Activity_Closure_Report_${activity.name?.replace(/[^a-z0-9]/gi, '_')}`,
            fileExtension: 'xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
    }


    private async template(request: { activity: Activity }): Promise<Buffer> {
        const subActivities = await this.activityRepository.findByParentActivityId(request.activity.id);
        const password = crypto.randomUUID();
        const activity = request.activity;
        const excelBuilder = this.documentGenerator.createExcelBuilder();
        const sheet = excelBuilder.addSheet({
            name: 'Activity Summary',
            autoSizeColumns: true,
            protection: {
                password: password,
                sheet: true
            },
        });

        sheet.addReportHeader({
            title: 'Activity Summary Report',
            mergeColumns: 3,
            generationDate: new Date(),
        })

        sheet
            .mergeCells(10, 1, 10, 3)
            .setCell(10, 1, 'Basic Information', ExcelStyles.sectionHeaderStyle)
            .setCell(11, 1, 'Name', ExcelStyles.labelBoldStyle).setCell(11, 2, activity.name, ExcelStyles.labelStyle)
            .setCell(12, 1, 'Type', ExcelStyles.labelBoldStyle).setCell(12, 2, activity.type, ExcelStyles.labelStyle)
            .setCell(13, 1, 'Scale', ExcelStyles.labelBoldStyle).setCell(13, 2, activity.scale, ExcelStyles.labelStyle)
            .setCell(14, 1, 'Status', ExcelStyles.labelBoldStyle).setCell(14, 2, activity.status, ExcelStyles.labelStyle)
            .setCell(15, 1, 'Priority', ExcelStyles.labelBoldStyle).setCell(15, 2, activity.priority, ExcelStyles.labelStyle)
            .setCell(16, 1, 'Venue', ExcelStyles.labelBoldStyle).setCell(16, 2, activity.venue || 'N/A', ExcelStyles.labelStyle)
            .setCell(17, 1, 'Location', ExcelStyles.labelBoldStyle).setCell(17, 2, activity.location || 'N/A', ExcelStyles.labelStyle)

            .mergeCells(19, 1, 19, 3)
            .setCell(19, 1, 'Participation & Metrics', ExcelStyles.sectionHeaderStyle)
            .setCell(20, 1, 'Expected Participants', ExcelStyles.labelBoldStyle).setCell(20, 2, activity.expectedParticipants || 0, ExcelStyles.labelStyle)
            .setCell(21, 1, 'Actual Participants', ExcelStyles.labelBoldStyle).setCell(21, 2, activity.actualParticipants || 0, ExcelStyles.labelStyle)

            .mergeCells(23, 1, 23, 3)
            .setCell(23, 1, 'Cost Details', ExcelStyles.sectionHeaderStyle)
            .setCell(24, 1, 'Estimated Cost', ExcelStyles.labelBoldStyle).setCell(24, 2, activity.estimatedCost || 0, ExcelStyles.rupeeAmountStyle)
            .setCell(25, 1, 'Actual Cost', ExcelStyles.labelBoldStyle).setCell(25, 2, activity.actualCost || 0, ExcelStyles.rupeeAmountStyle);

        const expenses = await this.expenseRepository.findAll({ expenseRefId: activity.id });
        const validExpenses = expenses.filter(e => e.status !== ExpenseStatus.REJECTED);
        const settledExpenses = validExpenses.filter(e => e.status === ExpenseStatus.SETTLED);
        const unsettledExpenses = validExpenses.filter(e => e.status !== ExpenseStatus.SETTLED);
        const settledAmount = settledExpenses.reduce((sum, e) => sum + e.amount, 0);
        const unsettledAmount = unsettledExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalExpenseAmount = settledAmount + unsettledAmount;

        const donations = await this.donationRepository.findAll({ forEventId: activity.id });
        const validDonations = donations.filter(d => d.status !== DonationStatus.CANCELLED);
        const paidDonations = validDonations.filter(d => d.status === DonationStatus.PAID);
        const unpaidDonations = validDonations.filter(d => d.status !== DonationStatus.PAID);
        const paidAmount = paidDonations.reduce((sum, d) => sum + d.amount, 0);
        const unpaidAmount = unpaidDonations.reduce((sum, d) => sum + d.amount, 0);
        const totalDonationAmount = paidAmount + unpaidAmount;

        sheet
            .mergeCells(27, 1, 27, 3)
            .setCell(27, 1, 'Financial Detail', ExcelStyles.sectionHeaderStyle)
            .setCell(28, 1, 'Total Expenses', ExcelStyles.labelBoldStyle).setCell(28, 2, totalExpenseAmount, ExcelStyles.rupeeAmountStyle)
            .setCell(29, 1, 'Settled Expenses', ExcelStyles.labelBoldStyle).setCell(29, 2, settledAmount, ExcelStyles.rupeeAmountStyle)
            .setCell(30, 1, 'Unsettled Expenses', ExcelStyles.labelBoldStyle).setCell(30, 2, unsettledAmount, ExcelStyles.rupeeAmountStyle)
            .setCell(31, 1, 'Total Donations', ExcelStyles.labelBoldStyle).setCell(31, 2, totalDonationAmount, ExcelStyles.rupeeAmountStyle)
            .setCell(32, 1, 'Paid Donations', ExcelStyles.labelBoldStyle).setCell(32, 2, paidAmount, ExcelStyles.rupeeAmountStyle)
            .setCell(33, 1, 'Unpaid Donations', ExcelStyles.labelBoldStyle).setCell(33, 2, unpaidAmount, ExcelStyles.rupeeAmountStyle);

        let nextRow = 35;
        if (subActivities.length > 0) {
            sheet
                .mergeCells(nextRow, 1, nextRow, 3)
                .setCell(nextRow, 1, 'Sub-Activities / Tasks', ExcelStyles.sectionHeaderStyle)
                .setCell(nextRow + 1, 1, 'Name', ExcelStyles.labelBoldStyle)
                .setCell(nextRow + 1, 2, 'Status', ExcelStyles.labelBoldStyle)
                .setCell(nextRow + 1, 3, 'Type', ExcelStyles.labelBoldStyle);

            let currentRow = nextRow + 2;
            for (const sub of subActivities) {
                sheet
                    .setCell(currentRow, 1, sub.name, ExcelStyles.labelStyle)
                    .setCell(currentRow, 2, sub.status, ExcelStyles.labelStyle)
                    .setCell(currentRow, 3, sub.type, ExcelStyles.labelStyle);
                currentRow++;
            }
        }

        const safeDate = (date?: Date | null) => date ? formatDate(date, { format: 'dd/MM/yyyy' }) : '-';

        const expensesData = validExpenses.map(exp => ({
            expenseId: exp.id,
            category: exp.referenceType || '-',
            name: exp.name,
            description: exp.description || '-',
            currency: exp.currency || 'INR',
            amount: exp.amount,
            status: exp.status,
            date: safeDate(exp.expenseDate),
            requestedBy: exp.requestedBy?.fullName || '-',
            paidBy: exp.paidBy?.fullName || '-',
            finalizedBy: exp.finalizedBy?.fullName || '-',
            settledBy: exp.settledBy?.fullName || '-',
            settledOn: safeDate(exp.settledDate),
            accountId: exp.accountId || '-',
            transactionId: exp.transactionId || '-',
            remarks: exp.remarks || '-',
        }));

        const donationsData = validDonations.map(don => ({
            donationId: don.id,
            donationType: `${don.type}${don.isGuest === true ? ' (Guest)' : ''}`,
            donorName: don.donorName || 'Anonymous',
            donorEmail: don.donorEmail || '-',
            donorPhone: don.donorNumber || '-',
            currency: don.currency || 'INR',
            amount: don.amount,
            status: don.status,
            raisedOn: safeDate(don.raisedOn),
            paidOn: safeDate(don.paidOn),
            paymentMethod: don.paymentMethod || '-',
            paidUsingUPI: don.paidUsingUPI || '-',
            transactionRef: don.transactionRef || '-',
            confirmedBy: don.confirmedBy?.fullName || '-',
            confirmedOn: safeDate(don.confirmedOn),
            remarks: don.remarks || '-',
        }));

        return await sheet
            .endSheet()
            .addSheet({
                name: 'Expenses',
                autoSizeColumns: true,
                autoFilter: true,
                freezePane: { row: 1 },
                protection: {
                    password: password,
                    sheet: true
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
                ]
            })
            .addRows(expensesData)
            .endSheet()
            .addSheet({
                name: 'Donations',
                autoSizeColumns: true,
                autoFilter: true,
                freezePane: { row: 1 },
                protection: {
                    password: password,
                    sheet: true
                },
                columns: [
                    { header: 'Donation ID', key: 'donationId' },
                    { header: 'Donation Type', key: 'donationType' },
                    { header: 'Donor Name', key: 'donorName' },
                    { header: 'Donor Email', key: 'donorEmail' },
                    { header: 'Donor Phone', key: 'donorPhone' },
                    { header: 'Currency', key: 'currency' },
                    { header: 'Amount', key: 'amount', style: ExcelStyles.rupeeAmountStyle },
                    { header: 'Status', key: 'status' },
                    { header: 'Raised Date', key: 'raisedOn' },
                    { header: 'Paid Date', key: 'paidOn' },
                    { header: 'Payment Method', key: 'paymentMethod' },
                    { header: 'UPI Type', key: 'paidUsingUPI' },
                    { header: 'Transaction Ref', key: 'transactionRef' },
                    { header: 'Confirmed By', key: 'confirmedBy' },
                    { header: 'Confirmed Date', key: 'confirmedOn' },
                    { header: 'Remarks', key: 'remarks' },
                ]
            })
            .addRows(donationsData)
            .endSheet()
            .build();
    }
}
