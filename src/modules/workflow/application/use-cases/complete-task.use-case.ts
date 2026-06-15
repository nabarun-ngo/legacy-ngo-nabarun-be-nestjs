import { Inject,Injectable,Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { User } from "src/modules/user/domain/model/user.model";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
WorkflowTask,
WorkflowTaskStatus,
} from "../../domain/model/workflow-task.model";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/workflow-instance.repository.interface";
import { WORKFLOW_INSTANCE_REPOSITORY } from "../../domain/repositories/workflow-instance.repository.interface";

class TaskUpdate {
  instanceId: string;
  taskId: string;
  status: WorkflowTaskStatus;
  remarks: string;
  completedBy?: Partial<User>;
  data?: Record<string, any>;
}

@Injectable()
export class CompleteTaskUseCase implements IUseCase<TaskUpdate, WorkflowTask> {
  private readonly logger = new Logger(CompleteTaskUseCase.name);
  constructor(
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instanceRepository: IWorkflowInstanceRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: TaskUpdate): Promise<WorkflowTask> {
    // Find instance with steps and tasks
    const instance = await this.instanceRepository.findById(
      request.instanceId,
      true,
    );
    if (!instance) {
      throw new BusinessException(
        `Workflow instance not found: ${request.instanceId}`,
      );
    }
    this.logger.log(
      `Updating task: ${request.taskId} in instance: ${request.instanceId}`,
    );
    const task = instance.updateTask(
      request.taskId,
      request.status,
      request.completedBy,
      request.remarks,
      request.data,
    );
    this.logger.log(`Task: ${request.taskId} updated successfully`);
    // Save instance
    await this.instanceRepository.update(instance.id, instance);
    this.logger.log(`Task: ${request.taskId} updated successfully`);
    // Emit domain events
    for (const event of instance.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    instance.clearEvents();

    return task;
  }
}
