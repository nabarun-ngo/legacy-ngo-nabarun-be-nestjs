import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import {
  CorrespondenceTargetUser,
  ICorrespondenceTrigger,
} from "src/shared/interfaces/correspondence-trigger.interface";
import { DomainEvent } from "../../../../shared/models/domain-event";
import { WorkflowTask } from "../model/workflow-task.model";

export class TaskCancelledEvent
  extends DomainEvent
  implements ICorrespondenceTrigger
{
  constructor(
    aggregateId: string,
    public readonly task: WorkflowTask,
  ) {
    super(aggregateId, task);
  }

  getCorrespondenceKey(): CorrespondenceKey {
    return CorrespondenceKey.TASK_CANCELLED;
  }

  getTargetUsers(): CorrespondenceTargetUser[] {
    return this.task.assignments.map((a) => a.assignedTo);
  }

  getTemplateData(): Record<string, any> {
    return { task: this.task.toJson() };
  }

  getReferenceId(): string {
    return this.task.id;
  }

  getReferenceType(): string {
    return "task";
  }
}
