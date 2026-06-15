import { Inject,Injectable } from "@nestjs/common";
import { AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import { User } from "src/modules/user/domain/model/user.model";
import { BusinessException } from "src/shared/exceptions/business-exception";
import {
type IWorkflowInstanceRepository,
WORKFLOW_INSTANCE_REPOSITORY,
} from "../../domain/repositories/workflow-instance.repository.interface";
import { StartWorkflowDto,WorkflowInstanceDto } from "../dto/workflow.dto";
import { WorkflowService } from "./workflow.service";

export interface WorkflowStartRequest {
  type: string;
  data: Record<string, any>;
  requestedBy?: string;
  requestedFor?: string;
  forExternalUser?: boolean;
  externalUserEmail?: string;
}

@Injectable()
export class WorkflowFacade {
  constructor(
    private readonly workflowService: WorkflowService,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly workflowRepository: IWorkflowInstanceRepository,
  ) {}

  async createWorkflow(
    input: StartWorkflowDto,
    requestedBy?: AuthUser,
  ): Promise<WorkflowInstanceDto> {
    return this.workflowService.createWorkflow(input, requestedBy);
  }

  async startWorkflow(
    request: WorkflowStartRequest,
  ): Promise<WorkflowInstanceDto> {
    return this.workflowService.createWorkflow(
      {
        type: request.type,
        data: request.data,
        requestedFor: request.requestedFor,
        forExternalUser: request.forExternalUser,
        externalUserEmail: request.externalUserEmail,
      },
      request.requestedBy
        ? ({ profile_id: request.requestedBy } as AuthUser)
        : undefined,
    );
  }

  async getInitiatedForUserId(workflowId: string): Promise<string> {
    const workflow = await this.workflowRepository.findById(workflowId, false);
    const userId = workflow?.initiatedFor?.id;

    if (!userId) {
      throw new BusinessException(
        `Initiated user not found for workflow: ${workflowId}`,
      );
    }

    return userId;
  }

  async updateInitiatedFor(
    workflowId: string,
    user: Partial<User>,
  ): Promise<void> {
    const workflow = await this.workflowRepository.findById(workflowId, false);

    if (!workflow) {
      throw new BusinessException(`Workflow instance not found: ${workflowId}`);
    }

    workflow.updateInitiatedFor(user);
    await this.workflowRepository.update(workflow.id, workflow);
  }
}
