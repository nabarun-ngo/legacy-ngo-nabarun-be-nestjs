import { Inject,Injectable } from "@nestjs/common";
import {
type IUserRepository,
USER_REPOSITORY,
} from "src/modules/user/domain/repositories/user.repository.interface";
import { WorkflowFacade } from "src/modules/workflow/application/services/workflow-facade.service";
import {
AutomaticTaskHandler,
IAutomaticTaskHandler,
} from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import {
WorkflowDefinition
} from "../../../../workflow/domain/vo/workflow-def.vo";

@Injectable()
@AutomaticTaskHandler("DonationPauseUpdateHandler")
export class DonationPauseUpdateHandler implements IAutomaticTaskHandler {
  handlerName = "DonationPauseUpdateHandler";

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly workflowFacade: WorkflowFacade,
  ) {}

  async handle(
    task: WorkflowTask,
    requestData?: Record<string, any>,
    definition?: WorkflowDefinition,
  ): Promise<void> {
    if (requestData?.startDate && requestData?.endDate) {
      const initiatedForUserId =
        await this.workflowFacade.getInitiatedForUserId(task.workflowId);
      const startDate = new Date(requestData?.startDate);
      const endDate = new Date(requestData?.endDate);
      const user = await this.userRepository.findById(initiatedForUserId);
      if (!user) {
        throw new Error(`User not found: ${initiatedForUserId}`);
      }
      user.updateAdmin({
        donationPauseStart: startDate,
        donationPauseEnd: endDate,
      });
      await this.userRepository.update(user.id, user);
    } else {
      throw new Error("Start date and end date are required");
    }
  }
}
