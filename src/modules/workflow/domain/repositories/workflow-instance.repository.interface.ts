import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { IRepository } from "../../../../shared/interfaces/repository.interface";
import {
WorkflowFilter,
WorkflowInstance,
} from "../model/workflow-instance.model";
import { TaskFilter,WorkflowTask } from "../model/workflow-task.model";

export interface IWorkflowInstanceRepository
  extends IRepository<WorkflowInstance, string, WorkflowFilter> {
  findAllTasks(filter: TaskFilter): Promise<WorkflowTask[]>;
  findTasksPaged(
    filter: BaseFilter<TaskFilter>,
  ): Promise<PagedResult<WorkflowTask>>;
  findById(
    id: string,
    includeSteps?: boolean,
  ): Promise<WorkflowInstance | null>;
  findByTaskId(taskId: string): Promise<WorkflowTask | null>;
  create(instance: WorkflowInstance): Promise<WorkflowInstance>;
  update(id: string, instance: WorkflowInstance): Promise<WorkflowInstance>;
  delete(id: string): Promise<void>;
}

export const WORKFLOW_INSTANCE_REPOSITORY = Symbol(
  "WORKFLOW_INSTANCE_REPOSITORY",
);
