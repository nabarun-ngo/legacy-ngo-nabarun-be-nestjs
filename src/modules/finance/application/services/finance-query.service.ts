import { Inject,Injectable } from "@nestjs/common";
import { Donation,DonationStatus } from "../../domain/model/donation.model";
import { Expense,ExpenseStatus } from "../../domain/model/expense.model";
import {
DONATION_REPOSITORY,
type IDonationRepository,
} from "../../domain/repositories/donation.repository.interface";
import {
EXPENSE_REPOSITORY,
type IExpenseRepository,
} from "../../domain/repositories/expense.repository.interface";

@Injectable()
export class FinanceQueryService {
  constructor(
    @Inject(DONATION_REPOSITORY)
    private readonly donationRepository: IDonationRepository,
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
  ) {}

  async getActivityExpenses(activityId: string): Promise<Expense[]> {
    return this.expenseRepository.findAll({ expenseRefId: activityId });
  }

  async getActivityDonations(activityId: string): Promise<Donation[]> {
    return this.donationRepository.findAll({ forEventId: activityId });
  }

  async hasUnsettledActivityExpenses(activityId: string): Promise<boolean> {
    const expenses = await this.getActivityExpenses(activityId);
    const allowedExpenseStatus = [
      ExpenseStatus.SETTLED,
      ExpenseStatus.REJECTED,
    ];
    return expenses.some(
      (expense) => !allowedExpenseStatus.includes(expense.status),
    );
  }

  async hasUnsettledActivityDonations(activityId: string): Promise<boolean> {
    const donations = await this.getActivityDonations(activityId);
    const allowedDonationStatus = [
      DonationStatus.PAID,
      DonationStatus.CANCELLED,
    ];
    return donations.some(
      (donation) => !allowedDonationStatus.includes(donation.status),
    );
  }
}
