import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { FinanceQueryService } from "src/modules/finance/application/services/finance-query.service";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { Activity,ActivityStatus } from "../../domain/model/activity.model";
import type { IActivityRepository } from "../../domain/repositories/activity.repository.interface";
import { ACTIVITY_REPOSITORY } from "../../domain/repositories/activity.repository.interface";
import { UpdateActivityDto } from "../dto/activity.dto";

@Injectable()
export class UpdateActivityUseCase
  implements IUseCase<{ activityId: string; data: UpdateActivityDto }, Activity>
{
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activityRepository: IActivityRepository,
    private readonly financeQuery: FinanceQueryService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async execute(request: {
    activityId: string;
    data: UpdateActivityDto;
  }): Promise<Activity> {
    const activity = await this.activityRepository.findById(request.activityId);
    if (!activity) {
      throw new BusinessException("Activity not found");
    }

    // Update domain entity
    activity.update(request.data);

    // Handle status update separately if provided
    if (request.data.status) {
      if (request.data.status == ActivityStatus.COMPLETED) {
        if (
          await this.financeQuery.hasUnsettledActivityExpenses(
            request.activityId,
          )
        ) {
          throw new BusinessException(
            "Cannot close activity because there are unsettled expenses.",
          );
        }
        if (
          await this.financeQuery.hasUnsettledActivityDonations(
            request.activityId,
          )
        ) {
          throw new BusinessException(
            "Cannot close activity because there are unsettled donations.",
          );
        }
      }
      activity.updateStatus(request.data.status);
    }

    const savedActivity = await this.activityRepository.update(
      request.activityId,
      activity,
    );
    for (const event of activity.domainEvents) {
      this.eventBus.emit(event.constructor.name, event);
    }
    return savedActivity;
  }
}
