import { DomainEvent } from "src/shared/models/domain-event";
import { Expense } from "../model/expense.model";

export class ExpenseRecordedEvent extends DomainEvent {
  constructor(public readonly expense: Expense) {
    super(expense.id, expense);
  }
}
