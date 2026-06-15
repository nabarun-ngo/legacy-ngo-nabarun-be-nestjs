import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { User,UserStatus } from "src/modules/user/domain/model/user.model";
import {
type IUserRepository,
USER_REPOSITORY,
} from "src/modules/user/domain/repositories/user.repository.interface";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { WorkflowTask } from "../../domain/model/workflow-task.model";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/workflow-instance.repository.interface";
import { WORKFLOW_INSTANCE_REPOSITORY } from "../../domain/repositories/workflow-instance.repository.interface";
import { WorkflowDefService } from "../../infrastructure/external/workflow-def.service";

export class ReassignTask {
  instanceId: string;
  taskId: string;
  userId?: string;
  fromDefinition?: boolean;
}

@Injectable()
export class ReassignTaskUseCase
  implements IUseCase<ReassignTask, WorkflowTask>
{
  constructor(
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instanceRepository: IWorkflowInstanceRepository,
    private readonly workflowDefService: WorkflowDefService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ReassignTask): Promise<WorkflowTask> {
    const task = await this.instanceRepository.findByTaskId(dto.taskId);
    if (!task) {
      throw new BusinessException(`Workflow task not found: ${dto.taskId}`);
    }

    const workflow = await this.instanceRepository.findById(
      task.workflowId,
      true,
    );
    if (!workflow) {
      throw new BusinessException(
        `Workflow instance not found: ${task.workflowId}`,
      );
    }

    let users: User[] = [];
    let roleCodes: string[] = [];

    if (dto.userId) {
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new BusinessException(`User not found: ${dto.userId}`);
      }
      users = [user];
      // If reassigned to specific user, we might still want to know what role they are acting in.
      // For now, let's assume we use all their roles or figure it out from definition if possible.
    }

    if (dto.fromDefinition) {
      const definition = await this.workflowDefService.findWorkflowByType(
        workflow?.type,
        workflow?.context,
      );
      if (!definition) {
        throw new BusinessException(
          `Workflow definition not found for type: ${workflow?.type}`,
        );
      }
      const actualTaskDef = definition.steps
        .find((s) => s.stepId === task.stepDefId)
        ?.tasks.find((t) => t.taskId === task?.taskDefId);
      if (!actualTaskDef) {
        throw new BusinessException(
          `Task definition not found for task: ${dto.taskId}`,
        );
      }

      const rawRoles = actualTaskDef.taskDetail?.assignedTo?.roleNames;
      if (rawRoles) {
        roleCodes = Array.isArray(rawRoles)
          ? rawRoles
          : (rawRoles || "")
              .trim()
              .split(",")
              .map((r) => r.trim());
      }
      if (roleCodes.length > 0) {
        users = await this.userRepository.findAll({
          roleCodes,
          status: UserStatus.ACTIVE,
        });
      }
    }

    if (users.length === 0) {
      throw new BusinessException("No users found for reassignment");
    }

    const updatedTask = workflow.assignTask(task.id, users, roleCodes, true);
    await this.instanceRepository.update(workflow.id, workflow);

    // Emit domain events
    for (const event of workflow.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    workflow.clearEvents();

    return updatedTask;
  }
}
