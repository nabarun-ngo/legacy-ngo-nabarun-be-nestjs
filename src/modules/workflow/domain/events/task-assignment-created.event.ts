import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import {
  CorrespondenceTargetUser,
  ICorrespondenceTrigger,
} from "src/shared/interfaces/correspondence-trigger.interface";
import { DomainEvent } from "../../../../shared/models/domain-event";
import { TaskAssignmentStatus } from "../model/task-assignment.model";
import { WorkflowTask } from "../../domain/model/workflow-task.model";

export class TaskAssignmentCreatedEvent
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
    return CorrespondenceKey.TASK_ASSIGNED;
  }

  getTargetUsers(): CorrespondenceTargetUser[] {
    return this.task.assignments
      .filter((a) => a.status === TaskAssignmentStatus.PENDING)
      .map((a) => a.assignedTo);
  }

  getTemplateData(): Record<string, any> {
    return { task: this.task.toJson(), workflowId: this.task.workflowId };
  }

  getReferenceId(): string {
    return this.task.id;
  }

  getReferenceType(): string {
    return "task";
  }
}
