import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CorrespondenceRequestEvent } from "src/modules/shared/correspondence/application/events/correspondence-request.event";
import { RedisHashCacheService } from "src/modules/shared/database/redis-hash-cache.service";
import { User } from "src/modules/user/domain/model/user.model";
import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import { DomainEventPayload } from "src/shared/dto/domain-event-payload.dto";
import { JobName } from "src/shared/job-names";
import {
evaluateCondition,
formatDate,
} from "src/shared/utilities/common.util";
import { ProcessJob } from "../../../shared/job-processing/application/decorators/process-job.decorator";
import { type Job } from "../../../shared/job-processing/presentation/dto/job.dto";
import {
WorkflowTask,
WorkflowTaskStatus,
WorkflowTaskType,
} from "../../domain/model/workflow-task.model";
import {
type IWorkflowInstanceRepository,
WORKFLOW_INSTANCE_REPOSITORY,
} from "../../domain/repositories/workflow-instance.repository.interface";
import { StartWorkflowDto } from "../dto/workflow.dto";
import { CompleteTaskUseCase } from "../use-cases/complete-task.use-case";
import { StartWorkflowUseCase } from "../use-cases/start-workflow.use-case";
import { WORKFLOW_DOMAIN_EVENTS_KEY } from "./domain-event-cache.handler";

export interface WorkflowAutomaticTaskJobData {
  instanceId: string;
  stepId: string;
  taskId: string;
  handler: string;
  requestData: Record<string, any>;
}

@Injectable()
export class WorkflowJobProcessor {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(WORKFLOW_INSTANCE_REPOSITORY)
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly redisCache: RedisHashCacheService,
    private readonly completeTask: CompleteTaskUseCase,
    private readonly startWorkflow: StartWorkflowUseCase,
  ) {}

  @ProcessJob({
    name: JobName.TriggerRemindPendingTasksEvent,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30 * 1000,
    },
  })
  async remindPendingTasks(job: Job<any>): Promise<void> {
    job.log("[INFO] Remind pending tasks started");
    const tasks = await this.workflowInstanceRepository.findAllTasks({
      status: WorkflowTask.pendingTaskStatus,
    });
    job.log(`[INFO] Found ${tasks.length} pending tasks`);

    if (tasks.length === 0) {
      job.log(`[WARN] No pending tasks found`);
      return;
    }

    const assignees = new Map(
      tasks
        .flatMap((t) => t.assignments)
        .map((a) => [a.assignedTo.id, a.assignedTo]),
    );

    job.log(`[INFO] Found ${assignees.size} Task Assignees`);
    for (const user of assignees.values()) {
      await this.processTaskReminder(user, job);
    }
    job.log(`[INFO] Remind pending tasks completed`);
  }

  private async processTaskReminder(user: User, job: Job<any>) {
    job.log(`[INFO] Sending reminder for user ${user.email}`);
    try {
      const allPendingTasks =
        await this.workflowInstanceRepository.findAllTasks({
          status: WorkflowTask.pendingTaskStatus,
          assignedTo: user.id,
        });

      if (allPendingTasks.length === 0) {
        job.log(`[WARN] No valid tasks found for reminder job ${job.id}`);
        return;
      }

      // Emit a single CorrespondenceRequestEvent — the orchestrator will send
      // both the TASK_REMINDER email (with table via tableDataFields) and push.
      this.eventEmitter.emit(
        CorrespondenceRequestEvent.name,
        new CorrespondenceRequestEvent({
          key: CorrespondenceKey.TASK_REMINDER,
          targetUsers: [user],
          data: {
            pendingTasks: allPendingTasks.map((task) => ({
              id: task.id,
              name: task.name,
              createdAt: formatDate(task.createdAt),
            })),
            taskCount: allPendingTasks.length,
            criticalAlert: "N", // Todo: determine if any tasks are critical
          },
        }),
      );

      job.log(
        `[INFO] Correspondence event emitted for user ${user.email} for ${allPendingTasks.length} tasks`,
      );
    } catch (error) {
      job.log(
        `[ERROR] Failed to send task reminder for user ${user.email} : ${error}`,
      );
      throw error;
    }
  }

  @ProcessJob({
    name: JobName.TriggerAutoCloseWorkflowTasksEvent,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30 * 1000,
    },
  })
  async closePendingTasks(job: Job<any>) {
    // Get the full list of events currently in the Redis list
    const queueDepth = await this.redisCache.getList<DomainEventPayload>(
      WORKFLOW_DOMAIN_EVENTS_KEY,
      "events",
    );
    if (!queueDepth || queueDepth.length === 0) {
      job.log("[WARN] No pending events.");
      return;
    }

    const aggregateIds = [...new Set(queueDepth.map((e) => e.aggregateId))];

    const tasks = await this.workflowInstanceRepository.findAllTasks({
      autoCloseRefId: aggregateIds.filter((id) => id !== undefined),
      status: WorkflowTask.pendingTaskStatus,
      type: [WorkflowTaskType.MANUAL],
    });

    job.log(`[INFO] Fetched ${tasks.length} tasks for evaluation.`);

    for (const task of tasks) {
      try {
        const queryEvent = queueDepth.find(
          (e) =>
            e.aggregateId === task.autoCloseRefId &&
            e.eventName === task.autoCloseEventName,
        );
        job.log(
          `[INFO] Evaluating task: ${task.id} for event: ${task.autoCloseEventName}`,
        );
        if (queryEvent) {
          job.log(
            `[INFO] Task: ${task.id} -> auto-closeable event name matched`,
          );
          const result = evaluateCondition(
            task.autoCloseCondition!,
            queryEvent.data,
          );
          if (result) {
            job.log(
              `[INFO] Task: ${task.id} -> auto-close condition matched ${JSON.stringify(task.autoCloseResultData)}`,
            );
            await this.completeTask.execute({
              instanceId: task.workflowId,
              taskId: task.id,
              remarks: `Domain event trigger : Auto-closed by ${queryEvent.eventName || "System Event"}`,
              status: WorkflowTaskStatus.COMPLETED,
              data: task.autoCloseResultData,
              completedBy: { fullName: "System" },
            });
            await this.redisCache.removeFromList(
              WORKFLOW_DOMAIN_EVENTS_KEY,
              "events",
              queryEvent,
            );
            job.log(`[INFO] Task: ${task.id} -> auto-closed successfully`);
          } else {
            job.log(
              `[INFO] Task: ${task.id} -> auto-close condition not matched`,
            );
          }
        } else {
          job.log(
            `[INFO] Task: ${task.id} -> auto-closeable event name not matched`,
          );
        }
      } catch (error) {
        job.log(`[ERROR] Failed to process task ${task.id} : ${error}`);
        throw error;
      }
    }
  }

  @ProcessJob({
    name: JobName.TriggerWorkflowRequestEvent,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30 * 1000,
    },
  })
  async handleTriggerWorkflowRequestEvent(
    job: Job<StartWorkflowDto>,
  ): Promise<void> {
    try {
      job.log(
        `[INFO] Starting workflow request event for type : ${job.data.type} and data : ${JSON.stringify(job.data.data)}`,
      );

      const workflow = await this.startWorkflow.execute({
        type: job.data.type,
        data: job.data.data,
        requestedFor: job.data.requestedFor,
        ...(job.data.forExternalUser ? { forExternalUser: true } : {}),
        ...(job.data.forExternalUser
          ? { externalUserEmail: job.data.externalUserEmail }
          : {}),
      });
      if (!workflow) {
        job.log(
          `[ERROR] Failed to process workflow request event : ${job.data.type}`,
        );
        return;
      }
    } catch (error) {
      job.log(`[ERROR] Failed to process workflow request event : ${error}`);
      throw error;
    }
  }
}
