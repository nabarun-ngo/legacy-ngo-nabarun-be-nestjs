import { Inject, Injectable } from "@nestjs/common";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../../../workflow/domain/vo/workflow-def.vo";
import { IAutomaticTaskHandler, AutomaticTaskHandler } from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { CreateUserUseCase } from "src/modules/user/application/use-cases/create-user.use-case";
import { WORKFLOW_INSTANCE_REPOSITORY, type IWorkflowInstanceRepository } from "../../../../workflow/domain/repositories/workflow-instance.repository.interface";
import { SignUpDto } from "src/modules/public/application/dto/public.dto";

@Injectable()
@AutomaticTaskHandler('Auth0UserCreationHandler')
export class Auth0UserCreationHandler implements IAutomaticTaskHandler {
    handlerName = 'Auth0UserCreationHandler';

    constructor(
        private readonly createUserUseCase: CreateUserUseCase,
        @Inject(WORKFLOW_INSTANCE_REPOSITORY)
        private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    ) { }

    async handle(task: WorkflowTask | TaskDef, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        const data = requestData as SignUpDto;
        let phoneNumber: string = data.contactNumber;
        let phoneCode: string = '91';

        if (data.contactNumber.split("-").length > 1) {
            phoneCode = data.contactNumber.split("-")[0].replace('+', '');
            phoneNumber = data.contactNumber.split("-")[1];
        }
        const user = await this.createUserUseCase.execute({
            email: data.email!,
            firstName: data.firstName!,
            lastName: data.lastName!,
            phoneNumber: {
                code: phoneCode!,
                number: phoneNumber!,
            },
            isTemporary: false,
        })

        // Mapping WorkflowTask vs TaskDef for workflowId
        if ('workflowId' in task && task.workflowId) {
            const workflowInstance = await this.workflowInstanceRepository.findById(task.workflowId, false)
            workflowInstance?.updateInitiatedFor(user!);
            await this.workflowInstanceRepository.update(workflowInstance!.id!, workflowInstance!)
        }
    }
}
