import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { PrismaPostgresService } from "../../../shared/database/prisma-postgres.service";
import type { IActivityRepository } from "../../domain/repositories/activity.repository.interface";
import { ACTIVITY_REPOSITORY } from "../../domain/repositories/activity.repository.interface";
import { LinkExpenseToActivityDto } from "../dto/activity.dto";

@Injectable()
export class LinkExpenseToActivityUseCase
  implements
    IUseCase<
      { activityId: string; data: LinkExpenseToActivityDto; createdBy: string },
      any
    >
{
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activityRepository: IActivityRepository,
    private readonly prisma: PrismaPostgresService,
  ) {}

  async execute(request: {
    activityId: string;
    data: LinkExpenseToActivityDto;
    createdBy: string;
  }): Promise<any> {
    // Verify activity exists
    const activity = await this.activityRepository.findById(request.activityId);
    if (!activity) {
      throw new BusinessException("Activity not found");
    }

    // Verify expense exists in Finance module
    const expense = await this.prisma.expense.findUnique({
      where: { id: request.data.expenseId },
    });
    if (!expense || expense.deletedAt) {
      throw new BusinessException("Expense not found");
    }

    // Update the expense to link it to this activity
    const updatedExpense = await this.prisma.expense.update({
      where: { id: request.data.expenseId },
      data: {
        referenceId: request.activityId,
        referenceType: "ACTIVITY",
      },
    });

    return updatedExpense;
  }
}
