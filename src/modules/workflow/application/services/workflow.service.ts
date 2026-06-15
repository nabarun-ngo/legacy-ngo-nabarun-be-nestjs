import { Inject,Injectable,Logger } from "@nestjs/common";
import { AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { fieldAttributeDomainToDto } from "src/shared/utilities/additional-field.util";
import { toKeyValueDto } from "src/shared/utilities/kv-config.util";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import {
WorkflowFilter,
WorkflowInstance,
} from "../../domain/model/workflow-instance.model";
import {
TaskFilter,
WorkflowTask,
WorkflowTaskStatus,
} from "../../domain/model/workflow-task.model";
import {
type IWorkflowInstanceRepository,
WORKFLOW_INSTANCE_REPOSITORY,
} from "../../domain/repositories/workflow-instance.repository.interface";
import { WorkflowDefService } from "../../infrastructure/external/workflow-def.service";
import { WorkflowDtoMapper } from "../dto/workflow-dto.mapper";
import {
StartWorkflowDto,
UpdateTaskDto,
WorkflowInstanceDto,
WorkflowRefDataDto,
WorkflowTaskDto,
} from "../dto/workflow.dto";
import { CancelWorkflowUseCase } from "../use-cases/cancel-workflow.use-case";
import { CompleteTaskUseCase } from "../use-cases/complete-task.use-case";
import { ReassignTaskUseCase } from "../use-cases/reassign-task.use-case";
import { StartWorkflowUseCase } from "../use-cases/start-workflow.use-case";
import { AutomaticTaskService } from "./automatic-task.service";

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instanceRepository: IWorkflowInstanceRepository,
    private readonly workflowStart: StartWorkflowUseCase,
    private readonly completeTask: CompleteTaskUseCase,
    private readonly taskService: AutomaticTaskService,
    private readonly workflowDefService: WorkflowDefService,
    private readonly reassignTaskUseCase: ReassignTaskUseCase,
    private readonly cancelWorkflowUseCase: CancelWorkflowUseCase,
  ) {}

  async getWorkflows(
    filter: BaseFilter<WorkflowFilter>,
  ): Promise<PagedResult<WorkflowInstanceDto>> {
    const result = await this.instanceRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: filter.props,
    });
    return new PagedResult<WorkflowInstanceDto>(
      result.content.map((m) => WorkflowDtoMapper.toDto(m)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async getWorkflow(
    id: string,
    includeTask: boolean,
  ): Promise<WorkflowInstanceDto> {
    const instance = await this.instanceRepository.findById(id, includeTask);
    return WorkflowDtoMapper.toDto(instance!);
  }

  async getWorkflowTasks(
    filter: BaseFilter<TaskFilter>,
  ): Promise<PagedResult<WorkflowTaskDto>> {
    const instance = await this.instanceRepository.findTasksPaged(filter);
    return new PagedResult<WorkflowTaskDto>(
      instance.content.map((m) => WorkflowDtoMapper.taskDomainToDto(m)),
      instance.totalSize,
      instance.pageIndex,
      instance.pageSize,
    );
  }

  async updateTask(
    id: string,
    taskId: string,
    dto: UpdateTaskDto,
    authUser: AuthUser,
  ): Promise<WorkflowTaskDto> {
    const instance = await this.completeTask.execute({
      instanceId: id,
      taskId: taskId,
      remarks: dto.remarks ?? "",
      status: dto.status,
      completedBy: { id: authUser.profile_id },
      data: dto.resultData,
    });
    return WorkflowDtoMapper.taskDomainToDto(instance);
  }

  async createWorkflow(input: StartWorkflowDto, requestedBy?: AuthUser) {
    const workflow = await this.workflowStart.execute({
      type: input.type,
      data: input.data,
      requestedBy: requestedBy?.profile_id!,
      requestedFor: input.requestedFor,
      forExternalUser: input.forExternalUser,
      externalUserEmail: input.forExternalUser
        ? input.externalUserEmail
        : undefined,
    });
    return WorkflowDtoMapper.toDto(workflow);
  }

  async processAutomaticTask(
    instance: string | WorkflowInstance,
    taskId: string,
  ): Promise<WorkflowTaskDto> {
    const workflow: WorkflowInstance | null =
      instance instanceof WorkflowInstance
        ? instance
        : await this.instanceRepository.findById(instance, true);
    const step = workflow?.steps.find(
      (s) => s.stepDefId === workflow.currentStepDefId,
    );
    const task = step?.tasks?.find((t) => t.id == taskId);

    if (!task) {
      throw new BusinessException(`Task not found: ${taskId}`);
    }

    if (!task.isAutomatic()) {
      throw new BusinessException(`Task is not automatic: ${taskId}`);
    }

    try {
      workflow?.updateTask(task.id, WorkflowTaskStatus.IN_PROGRESS);
      await this.taskService.handleTask(task, workflow?.context);
      workflow?.updateTask(
        task.id,
        WorkflowTaskStatus.COMPLETED,
        undefined,
        undefined,
        task.resultData,
      );
    } catch (error) {
      workflow?.updateTask(
        task.id,
        WorkflowTaskStatus.FAILED,
        undefined,
        error.message,
        task.resultData,
      );
    }

    await this.instanceRepository.update(workflow?.id!, workflow!);
    return WorkflowDtoMapper.taskDomainToDto(task);
  }

  async getWorkflowRefData(): Promise<WorkflowRefDataDto> {
    const refData = await this.workflowDefService.getWorkflowRefData();
    return {
      workflowTypes: refData.workflowTypes.map(toKeyValueDto),
      visibleWorkflowTypes: refData.visibleWorkflowTypes.map(toKeyValueDto),
      workflowStatuses: refData.workflowStatus.map(toKeyValueDto),
      workflowStepStatuses: refData.workflowStepStatus.map(toKeyValueDto),
      workflowTaskStatuses: refData.workflowTaskStatus.map(toKeyValueDto),
      workflowTaskTypes: refData.workflowTaskType.map(toKeyValueDto),
      visibleTaskStatuses: refData.visibleTaskStatus.map(toKeyValueDto),
      outstandingTaskStatuses: refData.workflowTaskStatus
        .filter((s) => !WorkflowTask.completedTaskStatus.includes(s.KEY as any))
        .map(toKeyValueDto),
      completedTaskStatuses: refData.workflowTaskStatus
        .filter((s) => WorkflowTask.completedTaskStatus.includes(s.KEY as any))
        .map(toKeyValueDto),
    };
  }

  async getAdditionalFields(type: string, stepId?: string, taskId?: string) {
    const additionalFields = await this.workflowDefService.getAdditionalFields(
      type,
      stepId,
      taskId,
    );
    return additionalFields.map((m) => fieldAttributeDomainToDto(m));
  }

  async reassignTask(
    instanceId: string,
    taskId: string,
    userId?: string,
    fromDefinition?: boolean,
  ): Promise<WorkflowTaskDto> {
    if (fromDefinition == false && !userId) {
      throw new BusinessException("User is required for reassignment");
    }
    const task = await this.reassignTaskUseCase.execute({
      instanceId,
      taskId,
      userId,
      fromDefinition,
    });
    return WorkflowDtoMapper.taskDomainToDto(task);
  }

  async cancelWorkflow(
    instanceId: string,
    reason: string,
    authUser: AuthUser,
  ): Promise<WorkflowInstanceDto> {
    const workflow = await this.cancelWorkflowUseCase.execute({
      id: instanceId,
      reason: reason,
      userId: authUser.profile_id!,
    });
    return WorkflowDtoMapper.toDto(workflow);
  }
}
