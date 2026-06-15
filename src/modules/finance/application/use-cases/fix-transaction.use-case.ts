import { Inject,Injectable } from "@nestjs/common";
import { PrismaPostgresService } from "src/modules/shared/database";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { DonationStatus } from "../../domain/model/donation.model";
import { ExpenseStatus } from "../../domain/model/expense.model";
import {
TransactionRefType,
TransactionType,
} from "../../domain/model/transaction.model";
import {
ACCOUNT_REPOSITORY,
type IAccountRepository,
} from "../../domain/repositories/account.repository.interface";
import {
DONATION_REPOSITORY,
type IDonationRepository,
} from "../../domain/repositories/donation.repository.interface";
import {
EXPENSE_REPOSITORY,
type IExpenseRepository,
} from "../../domain/repositories/expense.repository.interface";
import { FixTransactionDto } from "../dto/account.dto";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

@Injectable()
export class FixTransactionUseCase
  implements IUseCase<FixTransactionDto, void>
{
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
    private readonly transactionUseCase: CreateTransactionUseCase,
    private readonly prisma: PrismaPostgresService,
  ) {}

  async execute(request: FixTransactionDto): Promise<void> {
    for (const itemId of request.itemIds) {
      if (request.itemType == "DONATION") {
        const donation = await this.donationRepository.findById(itemId);
        if (!donation) {
          throw new BusinessException(`Donation not found with id: ${itemId}`);
        }
        if (donation.status != DonationStatus.PAID) {
          throw new BusinessException(`Donation is not in paid state`);
        }
        const account = await this.accountRepository.findById(
          request.newAccountId,
        );
        if (!account) {
          throw new BusinessException(
            `Account not found with id: ${request.newAccountId}`,
          );
        }

        const newTransaction = await this.transactionUseCase.execute({
          accountId: request.newAccountId,
          txnAmount: donation.amount,
          currency: "INR",
          txnDescription: `Donation amount for ${donation.id}, Payment method: ${donation.paymentMethod}, Paid using UPI: ${donation.paidUsingUPI}`,
          txnType: TransactionType.IN,
          txnDate: donation.paidOn,
          txnRefId: donation.id,
          txnRefType: TransactionRefType.DONATION,
        });
        await this.prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: DonationStatus.PAID,
            paidToAccountId: request.newAccountId,
            transactionRef: newTransaction,
          },
        });
        const doc = await this.prisma.documentMapping.findFirst({
          where: {
            entityId: donation.id,
            entityType: "DONATION",
          },
          select: {
            documentReferenceId: true,
          },
        });
        if (doc) {
          await this.prisma.documentMapping.updateMany({
            where: {
              documentReferenceId: doc.documentReferenceId,
              entityType: "TRANSACTION",
            },
            data: {
              entityId: newTransaction,
            },
          });
        }
      }

      if (request.itemType == "EXPENSE") {
        const expense = await this.expenseRepository.findById(itemId);
        if (!expense) {
          throw new BusinessException(`Expense not found with id: ${itemId}`);
        }
        if (expense.status != ExpenseStatus.SETTLED) {
          throw new BusinessException(`Expense is not in settled state`);
        }
        const account = await this.accountRepository.findById(
          request.newAccountId,
        );
        if (!account) {
          throw new BusinessException(
            `Account not found with id: ${request.newAccountId}`,
          );
        }
        const newTransaction = await this.transactionUseCase.execute({
          txnAmount: expense.amount,
          currency: expense.currency,
          accountId: request.newAccountId,
          txnDescription: `Expense settlement: ${expense.name}`,
          txnRefId: expense.id,
          txnRefType: TransactionRefType.EXPENSE,
          txnType: TransactionType.OUT,
          txnDate: new Date(),
        });
        await this.prisma.expense.update({
          where: { id: expense.id },
          data: {
            status: ExpenseStatus.SETTLED,
            accountId: request.newAccountId,
            transactionRef: newTransaction,
          },
        });
        const doc = await this.prisma.documentMapping.findFirst({
          where: {
            entityId: expense.id,
            entityType: "EXPENSE",
          },
          select: {
            documentReferenceId: true,
          },
        });
        if (doc) {
          await this.prisma.documentMapping.updateMany({
            where: {
              documentReferenceId: doc.documentReferenceId,
              entityType: "TRANSACTION",
            },
            data: {
              entityId: newTransaction,
            },
          });
        }
      }
    }
  }
}
