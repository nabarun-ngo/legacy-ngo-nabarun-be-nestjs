import { Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { WorkflowTask } from "../../domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../domain/vo/workflow-def.vo";
import { AutomaticTaskRegistryService } from "./automatic-task-registry.service";

@Injectable()
export class AutomaticTaskService {
    constructor(
        private readonly registry: AutomaticTaskRegistryService
    ) { }

    async handleTask(task: WorkflowTask | TaskDef, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        if (!task.handler) {
            throw new BusinessException(`No handler defined for automatic task: ${task.name}`);
        }
        const handler = this.registry.getHandler(task.handler);
        if (!handler) {
            throw new BusinessException(`Task handler not found: ${task.handler}`);
        }
        await handler.handle(task, requestData, definition);
    }
}


