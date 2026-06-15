import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { LockingService } from "src/modules/shared/database/locking.service";
import { generateUniqueNDigitNumber } from "src/shared/utilities/password-util";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
TransactionRefType,
TransactionType,
} from "../../domain/model/transaction.model";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";

interface CreateTeansaction {
  txnType: TransactionType | "TRANSFER";
  txnAmount: number;
  currency: string;
  accountId: string; // from Account Id
  transferToAccountId?: string; // to Account Id
  txnDescription: string;
  txnRefId?: string;
  txnRefType?: TransactionRefType;
  txnDate?: Date;
  comment?: string;
}

@Injectable()
export class CreateTransactionUseCase
  implements IUseCase<CreateTeansaction, string>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventEmitter2,
    private readonly lockingService: LockingService,
  ) {}

  async execute(request: CreateTeansaction): Promise<string> {
    const lockKeys = [request.accountId];
    if (request.txnType === "TRANSFER" && request.transferToAccountId) {
      lockKeys.push(request.transferToAccountId);
    }

    return await this.lockingService.withLocks(lockKeys, async () => {
      const transactionRef = `TXR${generateUniqueNDigitNumber(10)}`;

      if (request.txnType === "TRANSFER") {
        if (!request.transferToAccountId) {
          throw new BusinessException("Transfer to account id is required");
        }
        const fromAccount = await this.accountRepository.findById(
          request.accountId,
        );
        if (!fromAccount) {
          throw new BusinessException(
            "Account not found with id " + request.accountId,
          );
        }
        const toAccount = await this.accountRepository.findById(
          request.transferToAccountId,
        );
        if (!toAccount) {
          throw new BusinessException(
            "Account not found with id " + request.transferToAccountId,
          );
        }
        // Debit account
        fromAccount.debit(request.txnAmount, {
          transactionRef,
          description: request.txnDescription,
          txnDate: request.txnDate ?? new Date(),
          referenceId: request.txnRefId,
          referenceType: request.txnRefType,
          refAccountId: request.transferToAccountId,
        });

        // Credit to account
        toAccount.credit(request.txnAmount, {
          transactionRef,
          description: request.txnDescription,
          txnDate: request.txnDate ?? new Date(),
          referenceId: request.txnRefId,
          referenceType: request.txnRefType,
          refAccountId: request.accountId,
        });
        // Update account balance
        await this.accountRepository.update(fromAccount.id, fromAccount);
        await this.accountRepository.update(toAccount.id, toAccount);
        // Emit domain events
        for (const event of fromAccount.domainEvents) {
          this.eventBus.emit(event.constructor.name, event);
        }
        fromAccount.clearEvents();
        for (const event of toAccount.domainEvents) {
          this.eventBus.emit(event.constructor.name, event);
        }
        toAccount.clearEvents();
      } else {
        const account = await this.accountRepository.findById(
          request.accountId,
        );
        if (!account) {
          throw new BusinessException(
            "Account not found with id " + request.accountId,
          );
        }
        if (request.txnType === "IN") {
          // Credit account
          account.credit(request.txnAmount, {
            transactionRef,
            description: request.txnDescription,
            txnDate: request.txnDate ?? new Date(),
            referenceId: request.txnRefId,
            referenceType: request.txnRefType,
          });
        } else if (request.txnType === "OUT") {
          // Debit account
          account.debit(request.txnAmount, {
            transactionRef,
            description: request.txnDescription,
            txnDate: request.txnDate ?? new Date(),
            referenceId: request.txnRefId,
            referenceType: request.txnRefType,
          });
        }
        // Update account balance
        await this.accountRepository.update(account.id, account);
        for (const event of account.domainEvents) {
          this.eventBus.emit(event.constructor.name, event);
        }
        account.clearEvents();
      }
      return transactionRef;
    });
  }
}
