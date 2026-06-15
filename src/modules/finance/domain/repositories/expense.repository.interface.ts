import { IRepository } from "src/shared/interfaces/repository.interface";
import { Expense,ExpenseFilter } from "../model/expense.model";

export interface IExpenseRepository
  extends IRepository<Expense, string, ExpenseFilter> {}

export const EXPENSE_REPOSITORY = Symbol("EXPENSE_REPOSITORY");
