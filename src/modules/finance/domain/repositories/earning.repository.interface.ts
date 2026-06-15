import { IRepository } from "src/shared/interfaces/repository.interface";
import { Earning,EarningFilter } from "../model/earning.model";

export interface IEarningRepository
  extends IRepository<Earning, string, EarningFilter> {}

export const EARNING_REPOSITORY = Symbol("EARNING_REPOSITORY");
