import { Injectable } from "@nestjs/common";
import { DeleteUserUseCase } from "src/modules/user/application/use-cases/delete-user.use-case";
import { WorkflowFacade } from "src/modules/workflow/application/services/workflow-facade.service";
import {
AutomaticTaskHandler,
IAutomaticTaskHandler,
} from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import {
TaskDef,
WorkflowDefinition,
} from "../../../../workflow/domain/vo/workflow-def.vo";

@Injectable()
@AutomaticTaskHandler("UserDeleteAndDataCleanupHandler")
export class UserDeleteAndDataCleanupHandler implements IAutomaticTaskHandler {
  handlerName = "UserDeleteAndDataCleanupHandler";

  constructor(
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly workflowFacade: WorkflowFacade,
  ) {}

  async handle(
    task: WorkflowTask | TaskDef,
    requestData?: Record<string, any>,
    definition?: WorkflowDefinition,
  ): Promise<void> {
    const taskk = task as WorkflowTask;
    const initiatedForUserId = await this.workflowFacade.getInitiatedForUserId(
      taskk.workflowId,
    );
    await this.deleteUserUseCase.execute(initiatedForUserId);
  }
}
