import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { CorrespondenceRequestEvent } from "src/modules/shared/correspondence/application/events/correspondence-request.event";
import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import { UserDeletedEvent } from "src/modules/user/domain/events/user-deleted.event";
import { ApplyTryCatch } from "src/shared/decorators/apply-try-catch.decorator";
import { StepCompletedEvent } from "../../domain/events/step-completed.event";
import { StepStartedEvent } from "../../domain/events/step-started.event";
import { WorkflowCreatedEvent } from "../../domain/events/workflow-created.event";
import { WorkflowInstance } from "../../domain/model/workflow-instance.model";
import {
  WorkflowTask,
  WorkflowTaskType,
} from "../../domain/model/workflow-task.model";
import {
  WORKFLOW_INSTANCE_REPOSITORY,
  type IWorkflowInstanceRepository,
} from "../../domain/repositories/workflow-instance.repository.interface";
import { ReassignTaskUseCase } from "../use-cases/reassign-task.use-case";
import { StartWorkflowStepUseCase } from "../use-cases/start-workflow-step.use-case";

@Injectable()
export class WorkflowEventsHandler {
  constructor(
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly workflowRepository: IWorkflowInstanceRepository,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly reassignTaskUseCase: ReassignTaskUseCase,
    private readonly startWorkflowStep: StartWorkflowStepUseCase,
  ) {}

  // ── StepStartedEvent ─────────────────────────────────────────────────────

  @OnEvent(StepStartedEvent.name, { async: true })
  async handleStepStartedEvent(event: StepStartedEvent) {
    await this.startWorkflowStep.execute(event.instanceId);
  }

  // ── StepCompletedEvent — PATH A (needs DB lookup + conditional guard) ────

  @OnEvent(StepCompletedEvent.name, { async: true })
  async handleStepCompletedEvent(event: StepCompletedEvent) {
    const workflow = await this.workflowRepository.findById(event.aggregateId);
    if (
      workflow?.initiatedBy ||
      workflow?.initiatedFor ||
      workflow?.isExternalUser
    ) {
      this.emitWorkflowUpdateEmail(workflow, "Request Updated");
    }
  }

  // ── WorkflowCreatedEvent — PATH A (needs conditional guard) ──────────────

  @OnEvent(WorkflowCreatedEvent.name, { async: true })
  async handleWorkflowCreatedEvent(event: WorkflowCreatedEvent) {
    const workflow = await this.workflowRepository.findById(event.aggregateId);
    if (
      workflow?.initiatedBy ||
      workflow?.initiatedFor ||
      workflow?.isExternalUser
    ) {
      this.emitWorkflowUpdateEmail(workflow, "Request Created");
    }
  }

  // ── TaskAssignmentCreatedEvent — PATH B via ICorrespondenceTrigger ────────
  // ── TaskStartedEvent           — PATH B via ICorrespondenceTrigger ────────
  // ── TaskCancelledEvent         — PATH B via ICorrespondenceTrigger ────────
  // No handlers needed — domain events implement ICorrespondenceTrigger directly.

  // ── UserDeletedEvent — reassign pending tasks ─────────────────────────────

  @OnEvent(UserDeletedEvent.name, { async: true })
  @ApplyTryCatch()
  async handleUserDeletedEventReallocateTasks(event: UserDeletedEvent) {
    event.log(`Processing user deletion for user: ${event.user.id}`);
    const user = event.user;
    const tasks = await this.workflowInstanceRepository.findAllTasks({
      assignedTo: user.id,
      status: WorkflowTask.pendingTaskStatus,
      type: [WorkflowTaskType.MANUAL],
    });
    event.log(`Found ${tasks.length} pending tasks for user: ${event.user.id}`);
    for (const task of tasks) {
      event.log(`Reassigning task: ${task.id} for user: ${event.user.id}`);
      await this.reassignTaskUseCase.execute({
        taskId: task.id,
        instanceId: task.workflowId,
        fromDefinition: true,
      });
      event.log(`Reassigned task: ${task.id} for user: ${event.user.id}`);
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Emits a CorrespondenceRequestEvent for WORKFLOW_UPDATE.
   * Cannot use ICorrespondenceTrigger because:
   *  1. Requires a DB lookup to get the full WorkflowInstance.
   *  2. Has a conditional guard (only send if initiatedBy/For/isExternalUser).
   *
   * The step table is no longer mutated here — it is declared in
   * CORRESPONDENCE_CONFIG via tableDataFields and applied by EmailChannel.
   * This handler simply passes actualSteps as part of the data payload.
   *
   * EmailService is no longer injected here.
   */
  private emitWorkflowUpdateEmail(
    workflow: WorkflowInstance,
    action: string = "Request Created",
  ): void {
    const to: string[] = [];
    const cc: string[] = [];

    if (workflow.isExternalUser && workflow.externalUserEmail) {
      to.push(workflow.externalUserEmail);
    } else if (workflow.initiatedFor?.email) {
      to.push(workflow.initiatedFor.email);
    }
    if (workflow.initiatedBy?.email) {
      cc.push(workflow.initiatedBy.email);
    }

    if (to.length === 0) return;

    this.eventEmitter.emit(
      CorrespondenceRequestEvent.name,
      new CorrespondenceRequestEvent({
        key: CorrespondenceKey.WORKFLOW_UPDATE,
        targetUsers: to.map((email) => ({ id: "", email })),
        cc,
        data: {
          workflow: workflow.toJson(),
          action,
          currentStepName:
            workflow.steps?.find(
              (step) => step.stepDefId === workflow.currentStepDefId,
            )?.name ?? "",
          // actualSteps feeds the step-progress table via CORRESPONDENCE_CONFIG.tableDataFields
          actualSteps: workflow.actualSteps.map((m) => ({
            name: m.name,
            status: m.status,
          })),
        },
      }),
    );
  }
}
