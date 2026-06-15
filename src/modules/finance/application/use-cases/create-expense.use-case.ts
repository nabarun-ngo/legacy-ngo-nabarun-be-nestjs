import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
Expense,
ExpenseItem,
ExpenseRefType,
} from "../../domain/model/expense.model";
import type { IExpenseRepository } from "../../domain/repositories/expense.repository.interface";
import { EXPENSE_REPOSITORY } from "../../domain/repositories/expense.repository.interface";
import { ExpenseItemDetailDto } from "../dto/expense.dto";

class CreateExpense {
  name: string;
  description?: string;
  currency?: string;
  expenseDate?: Date;
  expenseRefId?: string;
  expenseItems?: ExpenseItemDetailDto[];
  requestedById: string;
  paidById: string;
  expenseRefType: ExpenseRefType;
}

@Injectable()
export class CreateExpenseUseCase implements IUseCase<CreateExpense, Expense> {
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: CreateExpense): Promise<Expense> {
    let expenseItems: ExpenseItem[] = [];
    if (request.expenseItems && request.expenseItems.length > 0) {
      expenseItems = request.expenseItems.map(
        (item) => new ExpenseItem(item.itemName, undefined, item.amount),
      );
    }

    const expense = Expense.create({
      name: request.name,
      description: request.description || "",
      requestedBy: { id: request.requestedById },
      paidBy: { id: request.paidById },
      referenceId: request.expenseRefId,
      referenceType: request.expenseRefType,
      expenseDate: request.expenseDate,
      currency: request.currency,
      expenseItems,
    });

    const savedExpense = await this.expenseRepository.create(expense);

    // Emit domain events
    for (const event of savedExpense.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    savedExpense.clearEvents();

    return savedExpense;
  }
}
