import { Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { WorkflowTask } from "../../domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../domain/vo/workflow-def.vo";
import { IAutomaticTaskHandler, AutomaticTaskHandler } from "./automatic-task-handler.interface";

@Injectable()
@AutomaticTaskHandler('ValidateInputs')
export class ValidateInputsHandler implements IAutomaticTaskHandler {
    handlerName = 'ValidateInputs';

    async handle(task: WorkflowTask | TaskDef, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void> {
        const required = definition?.fields.filter(f => f.mandatory).map(f => f.key) || [];
        this.validateRequiredKeys(requestData, required);
    }

    private validateRequiredKeys(
        data: Record<string, any> | undefined,
        required: string[],
    ) {
        if (!data) throw new BusinessException('Request data is missing');
        const missing = required.filter(k => !(k in data) || data[k] == null);
        if (missing.length) {
            throw new BusinessException(`Missing or null fields: ${missing.join(', ')}`);
        }
    }
}
