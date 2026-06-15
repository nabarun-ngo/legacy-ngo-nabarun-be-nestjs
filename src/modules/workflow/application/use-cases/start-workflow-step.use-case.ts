import { Inject,Injectable,Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { UserStatus } from "src/modules/user/domain/model/user.model";
import {
type IUserRepository,
USER_REPOSITORY,
} from "src/modules/user/domain/repositories/user.repository.interface";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { WorkflowInstance } from "../../domain/model/workflow-instance.model";
import {
WorkflowTaskStatus,
WorkflowTaskType,
} from "../../domain/model/workflow-task.model";
import type { IWorkflowInstanceRepository } from "../../domain/repositories/workflow-instance.repository.interface";
import { WORKFLOW_INSTANCE_REPOSITORY } from "../../domain/repositories/workflow-instance.repository.interface";
import { WorkflowDefService } from "../../infrastructure/external/workflow-def.service";
import { AutomaticTaskService } from "../services/automatic-task.service";

@Injectable()
export class StartWorkflowStepUseCase
  implements IUseCase<string, WorkflowInstance>
{
  private readonly logger = new Logger(StartWorkflowStepUseCase.name);
  constructor(
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instanceRepository: IWorkflowInstanceRepository,
    private readonly workflowDefService: WorkflowDefService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly automaticTaskService: AutomaticTaskService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(instanceId: string): Promise<WorkflowInstance> {
    const workflow = await this.instanceRepository.findById(instanceId, true);
    if (!workflow) {
      throw new BusinessException(`Workflow instance not found: ${instanceId}`);
    }
    const definition = await this.workflowDefService.findWorkflowByType(
      workflow?.type,
      workflow?.context,
    );
    if (!definition) {
      throw new BusinessException(
        `Workflow definition not found for type: ${workflow?.type}`,
      );
    }
    const taskDefs = definition.steps.find(
      (f) => f.stepId === workflow?.currentStepDefId,
    )?.tasks;

    if (taskDefs && taskDefs.length > 0) {
      const tasks = workflow.initCurrentStepTasks(taskDefs);

      for (const task of tasks) {
        if (task.type === WorkflowTaskType.AUTOMATIC) {
          try {
            workflow.updateTask(task.id, WorkflowTaskStatus.IN_PROGRESS);
            await this.automaticTaskService.handleTask(
              task,
              workflow.context,
              definition,
            );
            workflow.updateTask(
              task.id,
              WorkflowTaskStatus.COMPLETED,
              undefined,
              undefined,
              task.resultData,
            );
          } catch (error) {
            workflow.updateTask(
              task.id,
              WorkflowTaskStatus.FAILED,
              error.message,
              error.message,
              task.resultData,
            );
          }
        } else {
          const taskDef = taskDefs.find((td) => td.taskId == task.taskDefId);
          let roleCodes: string[] = [];
          const rawRoles = taskDef?.taskDetail?.assignedTo?.roleNames;
          if (rawRoles) {
            roleCodes = Array.isArray(rawRoles)
              ? rawRoles
              : (rawRoles || "")
                  .trim()
                  .split(",")
                  .map((r) => r.trim());
          }
          const users = await this.userRepository.findAll({
            roleCodes,
            status: UserStatus.ACTIVE,
          });
          if (users.length > 0) {
            workflow.assignTask(task.id, users, roleCodes);
            this.logger.log(
              `Task assigned to users: ${users.map((u) => u.id).join(", ")}`,
            );
          } else {
            this.logger.warn(`No users found for task: ${task.id}`);
          }
        }
      }
      await this.instanceRepository.update(workflow.id, workflow);
    }
    // Emit domain events
    for (const event of workflow.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    workflow.clearEvents();
    return workflow;
  }
}
