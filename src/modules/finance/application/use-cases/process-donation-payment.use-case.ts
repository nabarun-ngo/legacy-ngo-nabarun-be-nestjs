import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { Donation } from "../../domain/model/donation.model";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";
import type { IDonationRepository } from "../../domain/repositories/donation.repository.interface";
import { DONATION_REPOSITORY } from "../../domain/repositories/donation.repository.interface";
import type { ITransactionRepository } from "../../domain/repositories/transaction.repository.interface";
import { TRANSACTION_REPOSITORY } from "../../domain/repositories/transaction.repository.interface";
import { ProcessDonationPaymentDto } from "../dto/donation.dto";

@Injectable()
export class ProcessDonationPaymentUseCase
  implements IUseCase<ProcessDonationPaymentDto, Donation>
{
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: ProcessDonationPaymentDto): Promise<Donation> {
    const donation = await this.donationRepository.findById(request.donationId);
    if (!donation) {
      throw new BusinessException(
        `Donation not found with id: ${request.donationId}`,
      );
    }

    if (!donation.canBePaid()) {
      throw new BusinessException(
        `Donation cannot be paid in current status: ${donation.status}`,
      );
    }

    // Get account if provided
    // let account:Account | null = null;
    // if (request.accountId) {
    //   account = await this.accountRepository.findById(request.accountId);
    //   if (!account) {
    //     throw new BusinessException(`Account not found with id: ${request.accountId}`);
    //   }
    //   if (!account.isActive()) {
    //     throw new BusinessException('Cannot process payment to inactive account');
    //   }
    // }

    // // Create transaction
    // const transaction = Transaction.createIn({
    //   amount: donation.amount,
    //   currency: donation.currency,
    //   accountId: request.accountId || '',
    //   description: `Donation payment: ${donation.id || 'N/A'}`,
    //   referenceId: donation.id,
    //   referenceType: 'DONATION' as any,
    //   txnNumber: request.transactionRef,
    //   comment: request.remarks,
    //   transactionDate: request.paidOn,
    // });

    // Credit account if provided
    // if (account) {
    //   account.credit(donation.amount);
    //   await this.accountRepository.update(account.id, account);
    // }

    // // Save transaction
    // const savedTransaction = await this.transactionRepository.create(transaction);

    // Mark donation as paid
    // donation.markAsPaid({
    //   transactionId: savedTransaction.id,
    //   account : request.accountId,
    //   paymentMethod: request.paymentMethod as PaymentMethod,
    //   paidUsingUPI: request.paidUsingUPI as any,
    //   confirmedBy: undefined,
    // });

    if (request.isPaymentNotified) {
      donation.markPaymentNotified();
    }

    const updatedDonation = await this.donationRepository.update(
      donation.id,
      donation,
    );

    // Emit domain events
    for (const event of updatedDonation.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    updatedDonation.clearEvents();

    return updatedDonation;
  }
}
