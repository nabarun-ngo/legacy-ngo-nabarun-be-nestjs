import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import { Expense, ExpenseItem, ExpenseStatus } from '../../domain/model/expense.model';
import { EXPENSE_REPOSITORY } from '../../domain/repositories/expense.repository.interface';
import type { IExpenseRepository } from '../../domain/repositories/expense.repository.interface';
import { BusinessException } from '../../../../shared/exceptions/business-exception';
import { UpdateExpenseDto } from '../dto/expense.dto';

@Injectable()
export class UpdateExpenseUseCase implements IUseCase<{ id: string; dto: UpdateExpenseDto, updatedById: string }, Expense> {
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
  ) { }

  async execute(request: { id: string; dto: UpdateExpenseDto, updatedById: string }): Promise<Expense> {
    const expense = await this.expenseRepository.findById(request.id);
    if (!expense) {
      throw new BusinessException(`Expense not found with id: ${request.id}`);
    }

    let expenseItems: ExpenseItem[] | undefined;
    if (request.dto.expenseItems) {
      expenseItems = request.dto.expenseItems.map(item =>
        new ExpenseItem(
          item.itemName,
          undefined,
          item.amount,
        )
      );
    }

    if (request.dto.status == ExpenseStatus.SUBMITTED) {
      expense.submit({ id: request.updatedById });
    } else if (request.dto.status == ExpenseStatus.REJECTED) {
      expense.reject({ id: request.updatedById }, request.dto.remarks);
    } else {
      expense.update({
        name: request.dto.name,
        description: request.dto.description,
        expenseDate: request.dto.expenseDate,
        remarks: request.dto.remarks,
        payerId: request.dto.payerId,
        expenseItems,
        expenseRefType: request.dto.expenseRefType,
        expenseRefId: request.dto.expenseRefId,
      });
    }

    return await this.expenseRepository.update(request.id, expense);
  }
}


