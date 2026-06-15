import { Inject,Injectable,Logger } from "@nestjs/common";
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
@AutomaticTaskHandler("DonationAmountUpdateHandler")
export class DonationAmountUpdateHandler implements IAutomaticTaskHandler {
  handlerName = "DonationAmountUpdateHandler";
  private readonly logger = new Logger(DonationAmountUpdateHandler.name);

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
    this.logger.log("DonationAmountUpdateHandler: handle", {
      task,
      requestData,
      definition,
    });
    if (requestData?.newAmount) {
      const initiatedForUserId =
        await this.workflowFacade.getInitiatedForUserId(task.workflowId);
      const user = await this.userRepository.findById(initiatedForUserId);
      if (!user) {
        throw new Error(`User not found: ${initiatedForUserId}`);
      }
      this.logger.log("User found", user);
      user.updateAdmin({
        donationAmount: Number(requestData?.newAmount),
      });
      this.logger.log("User updated", user.toJson());
      await this.userRepository.update(user.id, user);
      this.logger.log("Donation amount updated successfully");
    } else {
      throw new Error("Donation amount is required");
    }
  }
}
