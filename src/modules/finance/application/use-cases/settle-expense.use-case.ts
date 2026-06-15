import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { Expense } from "../../domain/model/expense.model";
import {
TransactionRefType,
TransactionType,
} from "../../domain/model/transaction.model";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";
import type { IExpenseRepository } from "../../domain/repositories/expense.repository.interface";
import { EXPENSE_REPOSITORY } from "../../domain/repositories/expense.repository.interface";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

@Injectable()
export class SettleExpenseUseCase
  implements
    IUseCase<{ id: string; accountId: string; settledById: string }, Expense>
{
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly transactionUseCase: CreateTransactionUseCase,
  ) {}

  async execute(request: {
    id: string;
    accountId: string;
    settledById: string;
  }): Promise<Expense> {
    const expense = await this.expenseRepository.findById(request.id);
    if (!expense) {
      throw new BusinessException(`Expense not found with id: ${request.id}`);
    }

    if (!expense.isPayable()) {
      throw new BusinessException(
        `Expense cannot be settled in current status: ${expense.status}`,
      );
    }

    const account = await this.accountRepository.findById(request.accountId);
    if (!account) {
      throw new BusinessException(
        `Account not found with id: ${request.accountId}`,
      );
    }

    if (!account.hasSufficientFunds(expense.amount)) {
      throw new BusinessException("Insufficient account balance");
    }

    const transaction = await this.transactionUseCase.execute({
      txnAmount: expense.amount,
      currency: expense.currency,
      accountId: request.accountId,
      txnDescription: `Expense settlement: ${expense.id}`,
      txnRefId: expense.id,
      txnRefType: TransactionRefType.EXPENSE,
      txnType: TransactionType.OUT,
      txnDate: new Date(expense.expenseDate.getTime() + 2 * 60 * 60 * 1000),
    });

    // Settle expense
    expense.settle({
      settledBy: { id: request.settledById },
      accountId: request.accountId,
      transactionId: transaction,
    });

    const updatedExpense = await this.expenseRepository.update(
      expense.id,
      expense,
    );

    // Emit domain events
    for (const event of updatedExpense.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    updatedExpense.clearEvents();

    return updatedExpense;
  }
}
