import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DmsService } from "src/modules/shared/dms/application/services/dms.service";
import { DocumentMappingRefType } from "src/modules/shared/dms/domain/mapping.model";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
Donation,
DonationStatus,
PaymentMethod,
UPIPaymentType,
} from "../../domain/model/donation.model";
import {
TransactionRefType,
TransactionType,
} from "../../domain/model/transaction.model";
import type { IDonationRepository } from "../../domain/repositories/donation.repository.interface";
import { DONATION_REPOSITORY } from "../../domain/repositories/donation.repository.interface";
import { CreateTransactionUseCase } from "./create-transaction.use-case";
import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";

interface UpdateDonation {
  paidOn: Date | undefined;
  confirmedById?: string | undefined;
  paidUsingUPI?: UPIPaymentType | undefined;
  paymentMethod?: PaymentMethod;
  paidToAccountId?: string;
  status?: DonationStatus;
  forEvent?: string;
  remarks?: string;
  amount?: number;
  id: string;
}

@Injectable()
export class UpdateDonationUseCase
  implements IUseCase<UpdateDonation, Donation>
{
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    private readonly transactionUseCase: CreateTransactionUseCase,
    private readonly reverseTransactionUseCase: ReverseTransactionUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly documentService: DmsService,
  ) {}

  async execute(request: UpdateDonation): Promise<Donation> {
    const donation = await this.donationRepository.findById(request.id);
    if (!donation) {
      throw new BusinessException(`Donation not found with id: ${request.id}`);
    }
    donation.update({
      amount: request.amount,
      remarks: request.remarks,
      forEventId: request.forEvent,
    });

    // Update status if provided
    if (request.status) {
      switch (request.status) {
        case DonationStatus.CANCELLED:
          donation.cancel(request.remarks);
          break;
        case DonationStatus.PAYMENT_FAILED:
          donation.markAsFailed(request.remarks);
          break;
        case DonationStatus.PAY_LATER:
          donation.markAsPayLater(request.remarks!);
          break;
        case DonationStatus.UPDATE_MISTAKE:
          donation.markForUpdateMistake();
          await this.reverseTransactionUseCase.execute({
            reason: request.remarks || "Update mistake",
            transactionRef: donation.transactionRef!,
          });
          donation.resetPaymentDetails();
          const documents = await this.documentService.getDocuments(
            DocumentMappingRefType.DONATION,
            donation.id,
          );
          for (const doc of documents) {
            await this.documentService.deleteFile(doc.id);
          }
          break;
        case DonationStatus.PENDING:
          donation.markAsPending();
          break;
        case DonationStatus.PAID:
          donation.markAsPaid({
            paidToAccountId: request.paidToAccountId!,
            paymentMethod: request.paymentMethod!,
            paidUsingUPI: request.paidUsingUPI!,
            confirmedById: request.confirmedById!,
            paidDate: request.paidOn!,
          });

          const transactionRef = await this.transactionUseCase.execute({
            accountId: donation.paidToAccount?.id!,
            txnAmount: donation.amount,
            currency: "INR",
            txnDescription: `Donation amount for ${donation.id}, Payment method: ${request.paymentMethod}, Paid using UPI: ${request.paidUsingUPI}`,
            txnType: TransactionType.IN,
            txnDate: donation.paidOn,
            txnRefId: donation.id,
            txnRefType: TransactionRefType.DONATION,
          });
          donation.linkTransaction(transactionRef);
          break;
        default:
          break;
      }
    }
    const updatedDonation = await this.donationRepository.update(
      request.id,
      donation,
    );
    for (const event of donation.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    donation.clearEvents();
    return updatedDonation;
  }
}
