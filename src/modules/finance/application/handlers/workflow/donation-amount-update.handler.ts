import { Inject, Injectable, Logger } from "@nestjs/common";
import { IAutomaticTaskHandler, AutomaticTaskHandler } from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../../../workflow/domain/vo/workflow-def.vo";
import { type IUserRepository, USER_REPOSITORY } from "src/modules/user/domain/repositories/user.repository.interface";
import { type IWorkflowInstanceRepository, WORKFLOW_INSTANCE_REPOSITORY } from "../../../../workflow/domain/repositories/workflow-instance.repository.interface";

@Injectable()
@AutomaticTaskHandler('DonationAmountUpdateHandler')
export class DonationAmountUpdateHandler implements IAutomaticTaskHandler {
    handlerName = 'DonationAmountUpdateHandler';
    private readonly logger = new Logger(DonationAmountUpdateHandler.name);

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        @Inject(WORKFLOW_INSTANCE_REPOSITORY)
        private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    ) { }

    async handle(task: WorkflowTask, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        this.logger.log('DonationAmountUpdateHandler: handle', { task, requestData, definition });
        if (requestData?.newAmount) {
            const workflowInstance = await this.workflowInstanceRepository.findById(task.workflowId)
            if (!workflowInstance) {
                throw new Error(`Workflow instance not found: ${task.workflowId}`);
            }
            const user = await this.userRepository.findById(workflowInstance.initiatedFor?.id!);
            if (!user) {
                throw new Error(`User not found: ${workflowInstance.initiatedFor}`);
            }
            this.logger.log('User found', user);
            user.updateAdmin({
                donationAmount: Number(requestData?.newAmount),
            });
            this.logger.log('User updated', user.toJson());
            await this.userRepository.update(user.id, user);
            this.logger.log('Donation amount updated successfully');
        } else {
            throw new Error('Donation amount is required');
        }
    }
}
