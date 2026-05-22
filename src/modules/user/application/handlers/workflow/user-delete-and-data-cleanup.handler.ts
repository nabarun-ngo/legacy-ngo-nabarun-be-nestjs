import { Inject, Injectable } from "@nestjs/common";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../../../workflow/domain/vo/workflow-def.vo";
import { IAutomaticTaskHandler, AutomaticTaskHandler } from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { WORKFLOW_INSTANCE_REPOSITORY, type IWorkflowInstanceRepository } from "../../../../workflow/domain/repositories/workflow-instance.repository.interface";
import { DeleteUserUseCase } from "src/modules/user/application/use-cases/delete-user.use-case";

@Injectable()
@AutomaticTaskHandler('UserDeleteAndDataCleanupHandler')
export class UserDeleteAndDataCleanupHandler implements IAutomaticTaskHandler {
    handlerName = 'UserDeleteAndDataCleanupHandler';

    constructor(
        private readonly deleteUserUseCase: DeleteUserUseCase,
        @Inject(WORKFLOW_INSTANCE_REPOSITORY)
        private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    ) { }

    async handle(task: WorkflowTask | TaskDef, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        const taskk = task as WorkflowTask;
        const workflowInstance = await this.workflowInstanceRepository.findById(taskk.workflowId!, false)
        if (!workflowInstance?.initiatedFor?.id) {
            throw new Error('Initiated for user not found');
        }
        await this.deleteUserUseCase.execute(workflowInstance?.initiatedFor?.id);
    }
}
