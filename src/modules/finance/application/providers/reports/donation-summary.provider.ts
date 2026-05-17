import { Inject, Injectable } from '@nestjs/common';
import { IReportProvider, ReportGeneratedData } from '../../../../reporting/domain/reporting.interface';
import { DateTime } from 'luxon';
import { fileTypeFromBuffer } from 'file-type';
import { ReportProvider } from 'src/modules/reporting/domain/reporting.interface';
import { Role } from 'src/modules/user/domain/model/role.model';
import { formatDate } from 'src/shared/utilities/common.util';
import { DONATION_REPOSITORY, type IDonationRepository } from 'src/modules/finance/domain/repositories/donation.repository.interface';
import { ConfigService } from '@nestjs/config';
import { Donation, DonationStatus, DonationType, PaymentMethod } from 'src/modules/finance/domain/model/donation.model';
import { DocumentGeneratorService } from 'src/modules/shared/document-generator/services/document-generator.service';
import { Configkey } from 'src/shared/config-keys';
import { groupBy } from 'lodash';
import { IExcelRowData } from 'src/modules/shared/document-generator/interfaces/excel-generator.interface';
import { FieldDef } from 'src/shared/models/custom-field-def';

@Injectable()
@ReportProvider()
export class DonationSummaryReportProvider implements IReportProvider<{ startDate: Date; endDate: Date; }> {
    readonly reportCode = 'DONATION_SUMMARY_REPORT';
    constructor(
        @Inject(DONATION_REPOSITORY)
        private readonly donationRepository: IDonationRepository,
        private readonly documentGenerator: DocumentGeneratorService,
        private readonly configService: ConfigService,
    ) { }
    reportParams: FieldDef<'startDate' | 'endDate'>[] = [
        {
            key: 'startDate',
            label: 'Start Date',
            defKey: 'INPUT_DATE_FIELD',
            mandatory: true
        },
        {
            key: 'endDate',
            label: 'End Date',
            defKey: 'INPUT_DATE_FIELD',
            mandatory: true
        }
    ];

    async generate(params: { startDate: Date; endDate: Date; }): Promise<ReportGeneratedData> {
        const startDt = (typeof params.startDate === 'string'
            ? DateTime.fromISO(params.startDate)
            : DateTime.fromJSDate(params.startDate!)).setZone('Asia/Kolkata');
        const endDt = (typeof params.endDate === 'string'
            ? DateTime.fromISO(params.endDate)
            : DateTime.fromJSDate(params.endDate!)).setZone('Asia/Kolkata');

        const buffer = await this.template({
            startDate: startDt.toJSDate(),
            endDate: endDt.toJSDate(),
            on: 'paidOn'
        });

        const startDate = startDt.toFormat('dd-MM-yyyy');
        const endDate = endDt.toFormat('dd-MM-yyyy');

        // Check if period is exactly one full month
        const isExactFullMonth = startDt.day === 1 && endDt.toFormat('yyyy-MM-dd') === startDt.endOf('month').toFormat('yyyy-MM-dd');
        const fileName = isExactFullMonth
            ? `Donation_Summary_Report-${startDt.toFormat('MMMM_yyyy')}`
            : `Donation_Summary_Report-${startDate}_${endDate}`;
        const fileType = (await fileTypeFromBuffer(buffer))?.mime ?? 'application/octet-stream';
        return { buffer, fileName, contentType: fileType, fileExtension: 'xlsx' };
    }




    private async template(request: { startDate: Date, endDate: Date, on: 'paidOn' | 'confirmedOn' }): Promise<Buffer> {
        const monthName = formatDate(request.startDate!, {
            format: 'MMM yyyy'
        })

        const password = this.configService.get(Configkey.APP_SECRET);

        const paidDonations = await this.donationRepository.findAll({
            ...request.on === 'paidOn' ? {
                startDate_paidOn: request.startDate,
                endDate_paidOn: request.endDate
            } : {
                startDate_confirmedOn: request.startDate,
                endDate_confirmedOn: request.endDate
            },
            status: [DonationStatus.PAID]
        });

        const pendingDonations = await this.donationRepository.findAll({
            status: Donation.outstandingStatus,
            startDate_lte: request.endDate,
        });
        const accountWisePaidDonations = groupBy(paidDonations, (donation) => donation.paidToAccount?.id);
        const memberWisePendingDonations = groupBy(pendingDonations.filter(f => !f.isGuest), (donation) => donation.donorId);

        /**
         * ExcelData processing
         */
        const paidDonationsData: IExcelRowData[] = [];
        for (const donation of paidDonations) {
            paidDonationsData.push({
                id: donation.id,
                donationType: donation.type,
                period: donation.type == DonationType.REGULAR ? `${formatDate(donation.startDate!, {
                    format: 'MMM yyyy'
                })} - ${formatDate(donation.endDate!, {
                    format: 'MMM yyyy'
                })}` : '',
                donorName: donation.donorName,
                donationAmount: donation.amount,
                paidOn: formatDate(donation.paidOn!, { format: 'dd/MM/yyyy' }),
                confirmedOn: formatDate(donation.confirmedOn!, { format: 'dd/MM/yyyy' }),
                paidToAccount: `${donation.paidToAccount?.id} - ${donation.paidToAccount?.name}`,
                paymentMethod: donation.paymentMethod,
                confirmedBy: donation.confirmedBy?.fullName,
                txnId: donation.transactionRef
            });
        }
        const pendingDonationsData: IExcelRowData[] = [];
        for (const donation of pendingDonations) {
            pendingDonationsData.push({
                id: donation.id,
                donationType: donation.type,
                period: donation.type == DonationType.REGULAR ? `${formatDate(donation.startDate!, {
                    format: 'MMM yyyy'
                })} - ${formatDate(donation.endDate!, {
                    format: 'MMM yyyy'
                })}` : '', donorName: donation.donorName,
                donationAmount: donation.amount,
                status: donation.status,
            });
        }

        const accountWisePaidDonationsData: IExcelRowData[] = [];
        for (const [accountId, donations] of Object.entries(accountWisePaidDonations)) {
            accountWisePaidDonationsData.push({
                id: accountId,
                accountHolder: donations[0].paidToAccount?.name,
                accountType: donations[0].paidToAccount?.type,
                totalDonation: donations.reduce((acc, donation) => acc + donation.amount, 0),
                totalDonationsCount: donations.length,
                cashDonation: donations.filter(d => d.paymentMethod === PaymentMethod.CASH).reduce((acc, donation) => acc + donation.amount, 0),
                onlineDonation: donations.filter(d => d.paymentMethod !== PaymentMethod.CASH).reduce((acc, donation) => acc + donation.amount, 0),
            });
        }

        const donorWisePendingDonationsData: IExcelRowData[] = [];
        for (const [donorId, donations] of Object.entries(memberWisePendingDonations)) {
            donorWisePendingDonationsData.push({
                id: donorId,
                donorName: donations[0].donorName,
                totalDonation: donations.reduce((acc, donation) => acc + donation.amount, 0),
                pendingMonths: donations
                    .filter(d => d.startDate)
                    .map(d => formatDate(d.startDate!, {
                        format: 'MMMM yyyy'
                    })).join(", "),
            });
        }



        const summaryData = {
            totalPaidAmount: paidDonations.reduce((acc, d) => acc + d.amount, 0),
            totalPaidCount: paidDonations.length,
            totalPendingAmount: pendingDonations.reduce((acc, d) => acc + d.amount, 0),
            totalPendingCount: pendingDonations.length,
        };

        const excelBuilder = this.documentGenerator.createExcelBuilder();
        const summarySheet = excelBuilder.addSheet({
            name: 'Overall Summary',
            autoSizeColumns: true,
            protection: {
                sheet: true,
                password: password
            },
        });

        const leftPadding = 2;
        const allborder: any = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' } };
        summarySheet
            .setColumnWidth(leftPadding + 1, 30)
            .setColumnWidth(leftPadding + 2, 15)
            .setColumnWidth(leftPadding + 3, 20)
            .setColumnWidth(leftPadding + 4, 15)
            .setCell(1, leftPadding + 1, 'Donation Summary Report', { font: { bold: true, size: 18 } })
            .setCell(2, leftPadding + 1, `Period: ${formatDate(request.startDate, { format: 'dd/MM/yyyy' })} to ${formatDate(request.endDate, { format: 'dd/MM/yyyy' })}`, { font: { italic: true } })

            .setCell(4, leftPadding + 1, 'Key Metrics', { font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
            .mergeCells(4, leftPadding + 1, 4, leftPadding + 2)
            .setCell(5, leftPadding + 1, 'Total Paid Amount in ' + monthName, { border: allborder })
            .setCell(5, leftPadding + 2, summaryData.totalPaidAmount, { numFmt: '₹ #,##0.00', border: allborder })
            .setCell(6, leftPadding + 1, 'Total Paid Count in ' + monthName, { border: allborder })
            .setCell(6, leftPadding + 2, summaryData.totalPaidCount, { border: allborder })
            .setCell(7, leftPadding + 1, 'Total Pending Amount', { border: allborder })
            .setCell(7, leftPadding + 2, summaryData.totalPendingAmount, { numFmt: '₹ #,##0.00', border: allborder })
            .setCell(8, leftPadding + 1, 'Total Pending Count', { border: allborder })
            .setCell(8, leftPadding + 2, summaryData.totalPendingCount, { border: allborder })

            .setCell(10, leftPadding + 1, 'Account Wise Summary', { font: { bold: true, size: 12 }, fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFCC99' }, border: allborder })
            .mergeCells(10, leftPadding + 1, 10, leftPadding + 4)
            .setCell(11, leftPadding + 1, 'Account Name', { font: { bold: true }, border: allborder })
            .setCell(11, leftPadding + 2, 'Cash Donation', { font: { bold: true }, border: allborder })
            .setCell(11, leftPadding + 3, 'Non-Cash Donation', { font: { bold: true }, border: allborder })
            .setCell(11, leftPadding + 4, 'Total Amount', { font: { bold: true }, border: allborder })

        // Add account wise summary rows
        let summaryCurrentRow = 12;
        for (const acc of accountWisePaidDonationsData) {
            summarySheet.setCell(summaryCurrentRow, leftPadding + 1, `${acc.id} - ${acc.accountHolder}`, { alignment: { wrapText: true }, border: allborder });
            summarySheet.setCell(summaryCurrentRow, leftPadding + 2, acc.cashDonation, { numFmt: '₹ #,##0.00', border: allborder });
            summarySheet.setCell(summaryCurrentRow, leftPadding + 3, acc.onlineDonation, { numFmt: '₹ #,##0.00', border: allborder });
            summarySheet.setCell(summaryCurrentRow, leftPadding + 4, acc.totalDonation, { numFmt: '₹ #,##0.00', border: allborder });
            summaryCurrentRow++;
        }

        // Add footer
        summarySheet.setCell(summaryCurrentRow + 2, leftPadding + 1, `Generated on ${formatDate(new Date(), { format: 'dd/MM/yyyy HH:mm:ss' })}`, { font: { size: 8, italic: true } });
        summarySheet.setCell(summaryCurrentRow + 3, leftPadding + 1, `NOTE: This report is based on Donation ${request.on === 'paidOn' ? 'Payment Date' : 'Confirmation Date'}.`, { font: { size: 8, italic: true } });

        return await summarySheet
            .endSheet()
            .addSheet({
                name: `Paid Donations - ${monthName}`,
                protection: {
                    sheet: true,
                    password: password
                },
                freezePane: {
                    row: 1
                },
                columns: [
                    {
                        header: 'Donation Id',
                        key: 'id',
                    },
                    {
                        header: 'Donation Type',
                        key: 'donationType',
                    },
                    {
                        header: 'Donation Period',
                        key: 'period',
                    },
                    {
                        header: 'Donation Amount',
                        key: 'donationAmount',
                        style: { numFmt: '₹ #,##0.00' }
                    },
                    {
                        header: 'Donor Name',
                        key: 'donorName',
                    },
                    {
                        header: 'Paid On',
                        key: 'paidOn',
                    },
                    {
                        header: 'Paid To Account',
                        key: 'paidToAccount',
                    },
                    {
                        header: 'Payment Method',
                        key: 'paymentMethod',
                    },
                    {
                        header: 'Confirmed On',
                        key: 'confirmedOn',
                    },
                    {
                        header: 'Confirmed By',
                        key: 'confirmedBy',
                    },
                    {
                        header: 'Transaction Reference',
                        key: 'txnId',
                    }
                ]
            })
            .addRows(paidDonationsData)
            .endSheet()
            .addSheet({
                name: `Pending Donations`,
                protection: {
                    sheet: true,
                    password: password
                },
                freezePane: {
                    row: 1
                },
                columns: [
                    {
                        header: 'Donation Id',
                        key: 'id',
                    },
                    {
                        header: 'Donation Type',
                        key: 'donationType',
                    },
                    {
                        header: 'Donation Period',
                        key: 'period',
                    },
                    {
                        header: 'Donation Amount',
                        key: 'donationAmount',
                        style: { numFmt: '₹ #,##0.00' }
                    },
                    {
                        header: 'Donor Name',
                        key: 'donorName',
                    },
                    {
                        header: 'Donation Status',
                        key: 'status',
                    }
                ]
            })
            .addRows(pendingDonationsData)
            .endSheet()
            .addSheet({
                name: `Pending Donations - Donor Wise`,
                autoSizeColumns: true,
                protection: {
                    sheet: true,
                    password: password
                },
                freezePane: {
                    row: 1
                },
                columns: [
                    {
                        header: 'Donor Name',
                        key: 'donorName',
                    },
                    {
                        header: 'Total Outstanding Amount',
                        key: 'totalDonation',
                        style: { numFmt: '₹ #,##0.00' }

                    },
                    {
                        header: 'Outstanding Months',
                        key: 'pendingMonths',
                        width: 75,
                        style: {
                            alignment: {
                                wrapText: true,
                            }
                        }
                    }
                ]
            })
            .addRows(donorWisePendingDonationsData)
            .endSheet()
            .build();
    }


}
