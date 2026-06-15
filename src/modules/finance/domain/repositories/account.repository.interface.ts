import { IRepository } from "src/shared/interfaces/repository.interface";
import { Account,AccountFilter } from "../model/account.model";

export interface IAccountRepository
  extends IRepository<Account, string, AccountFilter> {}

export const ACCOUNT_REPOSITORY = Symbol("ACCOUNT_REPOSITORY");
