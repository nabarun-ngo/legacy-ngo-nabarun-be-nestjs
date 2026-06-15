import { IRepository } from "src/shared/interfaces/repository.interface";
import { Transaction,TransactionFilter } from "../model/transaction.model";

export interface ITransactionRepository
  extends IRepository<Transaction, string, TransactionFilter> {}

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");
