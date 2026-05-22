import { Inject, Injectable } from "@nestjs/common";
import { IAutomaticTaskHandler, AutomaticTaskHandler } from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../../../workflow/domain/vo/workflow-def.vo";
import { type IUserRepository, USER_REPOSITORY } from "src/modules/user/domain/repositories/user.repository.interface";
import { type IWorkflowInstanceRepository, WORKFLOW_INSTANCE_REPOSITORY } from "../../../../workflow/domain/repositories/workflow-instance.repository.interface";

@Injectable()
@AutomaticTaskHandler('DonationPauseUpdateHandler')
export class DonationPauseUpdateHandler implements IAutomaticTaskHandler {
    handlerName = 'DonationPauseUpdateHandler';

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        @Inject(WORKFLOW_INSTANCE_REPOSITORY)
        private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    ) { }

    async handle(task: WorkflowTask, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        if (requestData?.startDate && requestData?.endDate) {
            const workflowInstance = await this.workflowInstanceRepository.findById(task.workflowId)
            if (!workflowInstance) {
                throw new Error(`Workflow instance not found: ${task.workflowId}`);
            }
            const startDate = new Date(requestData?.startDate);
            const endDate = new Date(requestData?.endDate);
            const user = await this.userRepository.findById(workflowInstance.initiatedFor?.id!);
            if (!user) {
                throw new Error(`User not found: ${workflowInstance.initiatedFor}`);
            }
            user.updateAdmin({
                donationPauseStart: startDate,
                donationPauseEnd: endDate
            });
            await this.userRepository.update(user.id, user);
        } else {
            throw new Error('Start date and end date are required');
        }
    }
}
