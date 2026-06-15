import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { LockingService } from "src/modules/shared/database/locking.service";
import { DmsService } from "src/modules/shared/dms/application/services/dms.service";
import { DocumentMappingRefType } from "src/modules/shared/dms/domain/mapping.model";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
TransactionRefType,
TransactionStatus,
TransactionType
} from "../../domain/model/transaction.model";
import {
ACCOUNT_REPOSITORY,
type IAccountRepository,
} from "../../domain/repositories/account.repository.interface";
import type { ITransactionRepository } from "../../domain/repositories/transaction.repository.interface";
import { TRANSACTION_REPOSITORY } from "../../domain/repositories/transaction.repository.interface";

interface ReverseTransaction {
  //  accountId: string;
  transactionRef: string;
  reason: string;
}

@Injectable()
export class ReverseTransactionUseCase
  implements IUseCase<ReverseTransaction, void>
{
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly lockingService: LockingService,
    private readonly documentService: DmsService,
  ) {}

  async execute(request: ReverseTransaction): Promise<void> {
    if (!request.transactionRef || !request.reason) {
      throw new BusinessException(`Transaction Ref Id and Reason are required`);
    }
    const transactions = await this.transactionRepository.findAll({
      transactionRef: request.transactionRef,
      status: [TransactionStatus.SUCCESS],
    });
    if (!transactions) {
      throw new BusinessException(
        `Transactions not found with Ref Id: ${request.transactionRef}`,
      );
    }
    const lockKeys = transactions
      .filter((t) => t.accountId != null)
      .map((t) => t.accountId!);

    return await this.lockingService.withLocks(lockKeys, async () => {
      for (const transaction of transactions) {
        if (!transaction.accountId) {
          continue;
        }
        const account = await this.accountRepository.findById(
          transaction.accountId,
        );
        if (!account) {
          throw new BusinessException(
            `Account not found with id: ${transaction.accountId}`,
          );
        }

        const transactionDate = transaction.transactionDate;
        const reverseDate = new Date(
          transactionDate.getTime() + 60 * 60 * 1000,
        );

        if (transaction.type == TransactionType.IN) {
          account.debit(transaction.amount, {
            transactionRef: transaction.transactionRef,
            description: `Reversed transaction ${transaction.id} due to ${request.reason}`,
            txnDate: reverseDate,
            referenceId: transaction.id,
            referenceType: TransactionRefType.TXN_REVERSE,
            refAccountId: transaction.refAccountId,
          });
        } else if (transaction.type == TransactionType.OUT) {
          account.credit(transaction.amount, {
            transactionRef: transaction.transactionRef,
            description: `Reversed transaction ${transaction.id} due to ${request.reason}`,
            txnDate: reverseDate,
            referenceId: transaction.id,
            referenceType: TransactionRefType.TXN_REVERSE,
            refAccountId: transaction.refAccountId,
          });
        }
        account.transactions.find((t) => t.id == transaction.id)?.reverse();
        await this.accountRepository.update(account.id, account);
        for (const event of account.domainEvents) {
          this.eventEmitter.emit(event.constructor.name, event);
        }
        account.clearEvents();

        const documents = await this.documentService.getDocuments(
          DocumentMappingRefType.TRANSACTION,
          transaction.id,
        );
        for (const doc of documents) {
          await this.documentService.deleteFile(doc.id);
        }
      }
    });
  }
}
