import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { WorkflowInstance } from "../../domain/model/workflow-instance.model";
import {
type IWorkflowInstanceRepository,
WORKFLOW_INSTANCE_REPOSITORY,
} from "../../domain/repositories/workflow-instance.repository.interface";

@Injectable()
export class CancelWorkflowUseCase
  implements IUseCase<{ id: string; reason: string }, WorkflowInstance>
{
  constructor(
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly instanceRepository: IWorkflowInstanceRepository,
  ) {}

  async execute(request: {
    id: string;
    reason: string;
    userId: string;
  }): Promise<WorkflowInstance> {
    const instance = await this.instanceRepository.findById(request.id);
    if (!instance) {
      throw new BusinessException(
        `Workflow instance not found for id: ${request.id}`,
      );
    }
    if (
      instance.initiatedFor?.id !== request.userId &&
      instance.initiatedBy?.id !== request.userId
    ) {
      throw new BusinessException(
        `User not authorized to cancel workflow instance`,
      );
    }
    instance.cancel(request.reason, request.userId);
    await this.instanceRepository.update(instance.id, instance);
    return instance;
  }
}
