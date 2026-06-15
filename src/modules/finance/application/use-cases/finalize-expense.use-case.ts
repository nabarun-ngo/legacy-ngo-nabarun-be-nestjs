import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { Expense } from "../../domain/model/expense.model";
import type { IExpenseRepository } from "../../domain/repositories/expense.repository.interface";
import { EXPENSE_REPOSITORY } from "../../domain/repositories/expense.repository.interface";
import {
type ITransactionRepository,
TRANSACTION_REPOSITORY,
} from "../../domain/repositories/transaction.repository.interface";

@Injectable()
export class FinalizeExpenseUseCase
  implements IUseCase<{ id: string; finalizedById: string }, Expense>
{
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(request: {
    id: string;
    finalizedById: string;
  }): Promise<Expense> {
    const expense = await this.expenseRepository.findById(request.id);
    if (!expense) {
      throw new BusinessException(`Expense not found with id: ${request.id}`);
    }

    if (!expense.needsApproval()) {
      throw new BusinessException(
        `Expense cannot be finalized in current status: ${expense.status}`,
      );
    }

    expense.finalize({ id: request.finalizedById });
    const updatedExpense = await this.expenseRepository.update(
      request.id,
      expense,
    );
    return updatedExpense;
  }
}
