import { Inject, Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { WorkflowTask } from "../../../../workflow/domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../../../workflow/domain/vo/workflow-def.vo";
import { IAutomaticTaskHandler, AutomaticTaskHandler } from "../../../../workflow/application/automatic-task-handlers/automatic-task-handler.interface";
import { type IUserRepository, USER_REPOSITORY } from "src/modules/user/domain/repositories/user.repository.interface";

@Injectable()
@AutomaticTaskHandler('UserNotRegisteredTaskHandler')
export class UserNotRegisteredTaskHandler implements IAutomaticTaskHandler {
    handlerName = 'UserNotRegisteredTaskHandler';

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository
    ) { }

    async handle(task: WorkflowTask | TaskDef, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        const users = await this.userRepository.findAll({
            email: requestData?.email!
        })
        if (users.length > 0) {
            throw new BusinessException(`User already registered: ${requestData?.email!}`);
        }
    }
}
