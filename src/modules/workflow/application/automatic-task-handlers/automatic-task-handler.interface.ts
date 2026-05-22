import { SetMetadata } from "@nestjs/common";
import { WorkflowTask } from "../../domain/model/workflow-task.model";
import { TaskDef, WorkflowDefinition } from "../../domain/vo/workflow-def.vo";

export const AUTOMATIC_TASK_HANDLER_METADATA_KEY = 'AUTOMATIC_TASK_HANDLER_METADATA_KEY';

export const AutomaticTaskHandler = (handlerName: string) =>
    SetMetadata(AUTOMATIC_TASK_HANDLER_METADATA_KEY, handlerName);

export interface IAutomaticTaskHandler {
    handlerName: string;
    handle(task: WorkflowTask | TaskDef, requestData?: Record<string, any>, definition?: WorkflowDefinition): Promise<void>;
}
