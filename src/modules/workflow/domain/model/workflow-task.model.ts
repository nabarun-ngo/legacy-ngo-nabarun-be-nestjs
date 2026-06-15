import { User } from "src/modules/user/domain/model/user.model";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { generateUniqueNDigitNumber } from "src/shared/utilities/password-util";
import { BaseDomain } from "../../../../shared/models/base-domain";
import { TaskDef } from "../vo/workflow-def.vo";
import { TaskAssignment,TaskAssignmentStatus } from "./task-assignment.model";
import { WorkflowStep } from "./workflow-step.model";

export enum WorkflowTaskType {
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
}

export enum WorkflowTaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export class TaskFilter {
  readonly assignedTo?: string;
  readonly status?: WorkflowTaskStatus[];
  readonly type?: WorkflowTaskType[];
  readonly workflowId?: string;
  readonly taskId?: string;
  readonly autoCloseRefId?: string | string[];
}

export class WorkflowTask extends BaseDomain<string> {
  // 🔒 All private fields
  #step: WorkflowStep;
  #workflowId: string;
  #stepDefId: string;
  #taskDefId: string;
  #name: string;
  #description: string | null;
  #type: WorkflowTaskType;
  #status: WorkflowTaskStatus;
  #handler?: string;
  #checkList?: string[];
  #isAutoCloseable?: boolean;
  #autoCloseRefId?: string;
  #autoCloseEventName?: string;
  #autoCloseCondition?: string;
  #autoCloseResultData?: Record<string, any>;
  #completedAt?: Date;
  #completedBy?: Partial<User>;
  #remarks?: string;
  #resultData?: Record<string, any>;

  #assignments: TaskAssignment[] = [];

  constructor(
    id: string,
    step: WorkflowStep,
    workflowId: string,
    stepDefId: string,
    taskDefId: string,
    name: string,
    description: string | null,
    type: WorkflowTaskType,
    status: WorkflowTaskStatus,
    handler?: string,
    checkList?: string[],
    isAutoCloseable?: boolean,
    autoCloseRefId?: string,
    autoCloseEventName?: string,
    autoCloseCondition?: string,
    autoCloseResultData?: Record<string, any>,
    completedAt?: Date,
    completedBy?: User,
    remarks?: string,
    resultData?: Record<string, any>,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);

    this.#step = step;
    this.#workflowId = workflowId;
    this.#stepDefId = stepDefId;
    this.#taskDefId = taskDefId;
    this.#name = name;
    this.#description = description;
    this.#type = type;
    this.#status = status;
    this.#handler = handler;
    this.#checkList = checkList;
    this.#isAutoCloseable = isAutoCloseable;
    this.#autoCloseRefId = autoCloseRefId;
    this.#autoCloseEventName = autoCloseEventName;
    this.#autoCloseCondition = autoCloseCondition;
    this.#autoCloseResultData = autoCloseResultData;
    this.#completedAt = completedAt;
    this.#completedBy = completedBy;
    this.#remarks = remarks;
    this.#resultData = resultData;
  }

  static create(
    workflowId: string,
    step: WorkflowStep,
    task: TaskDef,
  ): WorkflowTask {
    return new WorkflowTask(
      `NWT${generateUniqueNDigitNumber(6)}`,
      step,
      workflowId,
      step.stepDefId,
      task.taskId,
      task.name,
      task.description,
      task.type,
      WorkflowTaskStatus.PENDING,
      task.handler,
      task.taskDetail?.checklist,
      task.taskDetail?.isAutoCloseable,
      task.taskDetail?.autoCloseRefId,
      task.taskDetail?.autoCloseEventName,
      task.taskDetail?.autoCloseCondition,
      task.taskDetail?.autoCloseResultData,
    );
  }

  // 🔧 Mutators
  addAssignment(assignment: TaskAssignment): void {
    this.#assignments.push(assignment);
    this.touch();
  }

  setAssignments(assignments: TaskAssignment[]): void {
    this.#assignments = [...assignments];
    this.touch();
  }

  reassign(assignments: TaskAssignment[]): void {
    if (this.#status === WorkflowTaskStatus.COMPLETED) {
      throw new BusinessException(
        `Cannot reassign a completed task: ${this.id}`,
      );
    }
    this.#assignments.forEach((a) => a.delete());
    this.#assignments.push(...assignments);
    this.#status = WorkflowTaskStatus.PENDING;
    this.touch();
  }

  start(starter?: Partial<User>): void {
    if (
      this.#status !== WorkflowTaskStatus.PENDING &&
      this.#status !== WorkflowTaskStatus.FAILED
    ) {
      throw new BusinessException(
        `Cannot start task in status: ${this.#status}`,
      );
    }
    const assignment = this.assignments
      .filter((a) => TaskAssignment.pendingStatus.includes(a.status))
      .find((a) => a.assignedTo.id == starter?.id);
    if (this.requiresManualAction() && !assignment) {
      throw new BusinessException(
        `User: ${starter?.fullName} cannot act on this task.`,
      );
    }
    assignment?.accept();
    this.#assignments
      .filter((f) => f.assignedTo.id != starter?.id)
      .forEach((a) => a.remove());
    this.#status = WorkflowTaskStatus.IN_PROGRESS;

    this.touch();
  }

  complete(
    completedBy?: Partial<User>,
    remarks?: string,
    resultData?: Record<string, any>,
  ): void {
    if (!this.#isAutoCloseable && completedBy?.fullName != "System") {
      if (this.#status !== WorkflowTaskStatus.IN_PROGRESS) {
        throw new BusinessException(
          `Cannot complete task in status: ${this.#status}`,
        );
      }
      const assignee = this.#assignments.find(
        (a) =>
          a.assignedTo.id == completedBy?.id &&
          a.status == TaskAssignmentStatus.ACCEPTED,
      );
      if (this.requiresManualAction() && !assignee) {
        throw new BusinessException(
          `User: ${completedBy?.id} cannot act on this task.`,
        );
      }
    }

    this.#status = WorkflowTaskStatus.COMPLETED;
    this.#completedBy = completedBy;
    this.#completedAt = new Date();
    this.#remarks = remarks;
    this.#resultData = resultData ?? this.#resultData;
    this.touch();
  }

  cancel(remarks?: string, cancelledBy?: Partial<User>): void {
    this.#assignments.forEach((a) => a.remove());
    this.#status = WorkflowTaskStatus.CANCELLED;
    this.#remarks = remarks;
    this.#completedBy = cancelledBy;
    this.#completedAt = new Date();
    this.touch();
  }

  fail(reason: string, completedBy?: Partial<User>): void {
    const assignee = this.#assignments.find(
      (a) =>
        a.assignedTo.id == completedBy?.id &&
        a.status == TaskAssignmentStatus.ACCEPTED,
    );
    if (this.requiresManualAction() && !assignee) {
      throw new BusinessException(
        `User: ${completedBy?.id} cannot act on this task.`,
      );
    }
    this.#status = WorkflowTaskStatus.FAILED;
    this.#remarks = reason;
    this.touch();
  }

  // 🔍 Query Methods
  isCompleted(): boolean {
    return this.#status === WorkflowTaskStatus.COMPLETED;
  }

  isAutomatic(): boolean {
    return this.#type === WorkflowTaskType.AUTOMATIC;
  }

  requiresManualAction(): boolean {
    return this.#type !== WorkflowTaskType.AUTOMATIC;
  }

  static get pendingTaskStatus(): WorkflowTaskStatus[] {
    return [
      WorkflowTaskStatus.PENDING,
      WorkflowTaskStatus.IN_PROGRESS,
      WorkflowTaskStatus.FAILED,
    ];
  }

  static get completedTaskStatus(): WorkflowTaskStatus[] {
    return [WorkflowTaskStatus.COMPLETED, WorkflowTaskStatus.CANCELLED];
  }

  get contextKey(): string {
    return `step_${this.#stepDefId}_task_${this.#taskDefId}`;
  }

  // 🔓 Getters (Public Read-Only API)

  get workflowId(): string {
    return this.#workflowId;
  }

  get stepDefId(): string {
    return this.#stepDefId;
  }

  get taskDefId(): string {
    return this.#taskDefId;
  }

  get name(): string {
    return this.#name;
  }

  get description(): string | null {
    return this.#description;
  }

  get type(): WorkflowTaskType {
    return this.#type;
  }

  get status(): WorkflowTaskStatus {
    return this.#status;
  }

  get handler(): string | undefined {
    return this.#handler;
  }

  get checkList(): string[] | undefined {
    return this.#checkList;
  }

  get isAutoCloseable(): boolean | undefined {
    return this.#isAutoCloseable;
  }

  get autoCloseRefId(): string | undefined {
    return this.#autoCloseRefId;
  }

  get assignedTo(): User | undefined {
    return this.#assignments.find(
      (a) => a.status === TaskAssignmentStatus.ACCEPTED,
    )?.assignedTo;
  }

  get assignments(): TaskAssignment[] {
    return [...this.#assignments];
  }

  get completedAt(): Date | undefined {
    return this.#completedAt;
  }

  get completedBy(): Partial<User> | undefined {
    return this.#completedBy;
  }

  get remarks(): string | undefined {
    return this.#remarks;
  }

  get resultData(): Record<string, any> | undefined {
    return this.#resultData ? { ...this.#resultData } : undefined;
  }

  set resultData(data: Record<string, any> | undefined) {
    this.#resultData = { ...(this.#resultData ?? {}), ...(data ?? {}) };
    this.touch();
  }

  get autoCloseEventName(): string | undefined {
    return this.#autoCloseEventName;
  }

  get autoCloseCondition(): string | undefined {
    return this.#autoCloseCondition;
  }

  get autoCloseResultData(): Record<string, any> | undefined {
    return this.#autoCloseResultData;
  }
}
