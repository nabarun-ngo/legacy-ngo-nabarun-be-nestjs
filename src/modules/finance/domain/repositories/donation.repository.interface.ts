import { IRepository } from "src/shared/interfaces/repository.interface";
import { Donation,DonationFilter } from "../model/donation.model";

export interface IDonationRepository
  extends IRepository<Donation, string, DonationFilter> {}

export const DONATION_REPOSITORY = Symbol("DONATION_REPOSITORY");
