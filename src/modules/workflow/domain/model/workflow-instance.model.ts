import { User } from "src/modules/user/domain/model/user.model";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { evaluateCondition } from "src/shared/utilities/common.util";
import { generateUniqueNDigitNumber } from "src/shared/utilities/password-util";
import { AggregateRoot } from "../../../../shared/models/aggregate-root";
import { StepCompletedEvent } from "../events/step-completed.event";
import { StepStartedEvent } from "../events/step-started.event";
import { TaskAssignmentCreatedEvent } from "../events/task-assignment-created.event";
import { TaskCancelledEvent } from "../events/task-cancelled.event";
import { TaskCompletedEvent } from "../events/task-completed.event";
import { TaskFailedEvent } from "../events/task-failed.event";
import { TaskStartedEvent } from "../events/task-started.event";
import { WorkflowCreatedEvent } from "../events/workflow-created.event";
import { TaskDef,WorkflowDefinition } from "../vo/workflow-def.vo";
import { TaskAssignment } from "./task-assignment.model";
import { WorkflowStep } from "./workflow-step.model";
import { WorkflowTask,WorkflowTaskStatus } from "./workflow-task.model";

export enum WorkflowInstanceStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

// export enum WorkflowType {
//   JOIN_REQUEST = 'JOIN_REQUEST',
//   CONTACT_REQUEST = "CONTACT_REQUEST",
//   DONATION_REQUEST = "DONATION_REQUEST",

// }

export interface WorkflowFilter {
  readonly initiatedBy?: string;
  readonly initiatedFor?: string;
  readonly status?: WorkflowInstanceStatus[];
  readonly type?: string[];
  readonly delegated?: boolean;
  readonly workflowId?: string;
}

export class WorkflowInstance extends AggregateRoot<string> {
  #type: string;
  #name: string;
  #description: string;
  #status: WorkflowInstanceStatus;
  #initiatedBy?: Partial<User>;
  #initiatedFor?: Partial<User>;
  #requestData?: Record<string, string>;
  #currentStepDefId?: string;
  #completedAt?: Date;
  #remarks?: string;
  #steps: WorkflowStep[] = [];
  #isExternalUser: boolean | undefined;
  #externalUserEmail: string | undefined;
  #context?: Record<string, any>;

  constructor(
    protected _id: string,
    type: string,
    name: string,
    description: string,
    status: WorkflowInstanceStatus,
    initiatedBy?: Partial<User>,
    initiatedFor?: Partial<User>,
    requestData?: Record<string, string>,
    context?: Record<string, any>,
    isExternalUser?: boolean,
    externalUserEmail?: string,
    currentStepDefId?: string,
    completedAt?: Date,
    remarks?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(_id, createdAt, updatedAt);

    this.#type = type;
    this.#name = name;
    this.#description = description;
    this.#status = status;
    this.#initiatedBy = initiatedBy;
    this.#initiatedFor = initiatedFor;
    this.#requestData = requestData;
    this.#isExternalUser = isExternalUser;
    this.#externalUserEmail = externalUserEmail;
    this.#currentStepDefId = currentStepDefId;
    this.#completedAt = completedAt;
    this.#remarks = remarks;
    this.#context = context;
  }

  static create(data: {
    type: string;
    definition: WorkflowDefinition;
    requestedBy: Partial<User>;
    data?: Record<string, any>;
    requestedFor?: Partial<User>;
    forExternalUser?: boolean;
    externalUserEmail?: string;
  }) {
    if (data.forExternalUser && !data.externalUserEmail) {
      throw new BusinessException("External user email is required");
    }
    const instance = new WorkflowInstance(
      `NW${generateUniqueNDigitNumber(6)}`,
      data.type,
      data.definition.name,
      data.definition.description,
      WorkflowInstanceStatus.PENDING,
      data.requestedBy,
      data.requestedFor ??
        (data.forExternalUser ? undefined : data.requestedBy),
      // If external user, then requestedFor will be undefined, need to be updated later if required
      data.data,
      data.data,
      data.forExternalUser,
      data.externalUserEmail,
    );

    data.definition.steps.forEach((step) => {
      instance.addSteps(WorkflowStep.create(step));
    });

    instance.addDomainEvent(new WorkflowCreatedEvent(instance));
    return instance;
  }

  public addSteps(step: WorkflowStep): void {
    this.#steps.push(step);
    this.touch();
  }

  public start(): void {
    this.#status = WorkflowInstanceStatus.IN_PROGRESS;
    this.#currentStepDefId = this.steps.find(
      (s) => s.orderIndex === 0,
    )?.stepDefId;
    const step = this.steps.find((s) => s.stepDefId === this.#currentStepDefId);
    step?.start();
    this.addDomainEvent(
      new StepStartedEvent(step?.id!, this.id, step?.id!, this),
    );
    this.touch();
  }

  public moveToNextStep() {
    const currentStep = this.#steps.find(
      (s) => s.stepDefId === this.#currentStepDefId,
    );

    if (!currentStep) {
      throw new Error(`Current step not found: ${this.#currentStepDefId}`);
    }

    let nextStepId: string | undefined;

    // Evaluate transitions from the current step
    for (const transition of currentStep.transitions) {
      const d =
        transition.condition === "default" ||
        !transition.condition ||
        evaluateCondition(transition.condition, this.#context || {});
      if (d) {
        nextStepId = transition.nextStepId;
        break;
      }
    }

    if (!nextStepId) {
      // If no next step is found after a step completion, the workflow is finished
      this.complete();
      return;
    }
    // If the next step is the same as the current step, do nothing
    if (this.#currentStepDefId === nextStepId) return;

    // Set the next step as the current step
    this.#currentStepDefId = nextStepId;
    const nextStep = this.#steps.find(
      (s) => s.stepDefId === this.#currentStepDefId,
    );
    if (!nextStep) {
      throw new Error(`Next step not found: ${this.#currentStepDefId}`);
    }
    //TODO: Need to handle the order index properly
    // If the revisited step is already then handle it some way
    nextStep.currentOrderIndex = currentStep.orderIndex + 1;
    nextStep.start();
    this.addDomainEvent(
      new StepStartedEvent(nextStep.id, this.id, nextStep.id, this),
    );
    this.touch();
  }

  public initCurrentStepTasks(taskDefs: TaskDef[]): WorkflowTask[] {
    const step = this.#steps.find(
      (s) => s.stepDefId === this.#currentStepDefId,
    );
    if (!step) {
      throw new BusinessException(`Step not found: ${this.#currentStepDefId}`);
    }
    const tasks = taskDefs.map((td) => WorkflowTask.create(this.id, step, td));
    step.setTasks(tasks);
    this.touch();
    return tasks;
  }

  public assignTask(
    taskId: string,
    users: User[],
    roleCodes: string[],
    isReassign: boolean = false,
  ) {
    const step = this.#steps.find(
      (s) => s.stepDefId === this.#currentStepDefId,
    );
    const task = step?.tasks?.find((t) => t.id === taskId);
    if (!task) {
      throw new BusinessException(`Task not found: ${taskId}`);
    }

    const assignments = users.map((u) =>
      TaskAssignment.create({
        taskId: task.id,
        assignedTo: u,
        roleName:
          roleCodes && roleCodes.length > 0
            ? u.roles.find((r) => roleCodes.includes(r.roleCode))?.roleCode!
            : undefined,
      }),
    );
    if (isReassign) {
      task.reassign(assignments);
    } else {
      task.setAssignments(assignments);
    }
    this.addDomainEvent(new TaskAssignmentCreatedEvent(this.id, task));
    this.touch();
    return task;
  }

  updateTask(
    taskId: string,
    status: WorkflowTaskStatus,
    user?: Partial<User>,
    remarks?: string,
    data?: Record<string, any>,
  ) {
    const step = this.steps.find((s) => s.stepDefId === this.#currentStepDefId);
    const task = step?.tasks?.find((t) => t.id === taskId);

    if (!task) {
      throw new BusinessException(`Task not found: ${taskId}`);
    }

    // Check if task can be completed
    if (task.status === WorkflowTaskStatus.COMPLETED) {
      throw new BusinessException(`Task is already completed: ${task.id}`);
    }
    if (data) {
      task.resultData = data;
      this.#mergeResultIntoContext(task, data);
    }
    if (task.status !== status) {
      switch (status) {
        case WorkflowTaskStatus.IN_PROGRESS:
          task.start(user);
          this.addDomainEvent(new TaskStartedEvent(this.id, task));
          break;
        case WorkflowTaskStatus.COMPLETED:
          task.complete(user, remarks, data);
          this.addDomainEvent(new TaskCompletedEvent(this.id, task));
          break;
        case WorkflowTaskStatus.FAILED:
          task.fail(remarks!, user);
          this.addDomainEvent(new TaskFailedEvent(this.id, task));
          break;
        default:
          throw new BusinessException(`Invalid task status: ${status}`);
      }
    }

    if (step?.isAllTasksCompleted()) {
      step.complete();
      this.moveToNextStep();
      this.addDomainEvent(new StepCompletedEvent(this.id, step?.id, this));
      return task;
    }

    this.touch();
    return task;
  }

  #mergeResultIntoContext(task: WorkflowTask, data: Record<string, any>): void {
    this.#context = {
      ...this.#context,
      [task.contextKey]: {
        ...(this.#context?.[task.contextKey] ?? {}),
        ...data,
      },
    };
    this.touch();
  }

  public complete(): void {
    if (this.#status === WorkflowInstanceStatus.COMPLETED) {
      throw new BusinessException(
        `Cannot complete workflow in status: ${this.#status}`,
      );
    }
    this.#status = WorkflowInstanceStatus.COMPLETED;
    this.#completedAt = new Date();
    this.#currentStepDefId = undefined;
    this.touch();
  }

  public fail(reason: string): void {
    this.#status = WorkflowInstanceStatus.FAILED;
    this.#remarks = reason;
    this.touch();
  }

  public cancel(reason: string, userId: string): void {
    if (
      this.#status === WorkflowInstanceStatus.CANCELLED ||
      this.#status === WorkflowInstanceStatus.COMPLETED
    ) {
      throw new BusinessException(
        `Cannot cancel workflow in status: ${this.#status}`,
      );
    }

    this.#status = WorkflowInstanceStatus.CANCELLED;
    this.#remarks = `User Cancelled due to : ${reason}`;
    const step = this.steps.find((s) => s.stepDefId === this.#currentStepDefId);
    if (step) {
      step.complete();
      step.tasks.forEach((task) => {
        if (
          task.status == WorkflowTaskStatus.IN_PROGRESS ||
          task.status == WorkflowTaskStatus.PENDING
        ) {
          task.cancel(this.#remarks, { id: userId });
          this.addDomainEvent(new TaskCancelledEvent(this.id, task));
        }
      });
      this.addDomainEvent(new StepCompletedEvent(this.id, step.id, this));
    }
    this.touch();
  }

  public updateInitiatedFor(user: Partial<User>) {
    this.#initiatedFor = user;
    this.touch();
  }

  get isAllStepsCompleted(): boolean {
    return this.#steps.length > 0 && this.#steps.every((s) => s.isCompleted());
  }

  // --- GETTERS (auto-picked by toJson) ---
  get name(): string {
    return this.#name;
  }

  get description(): string {
    return this.#description;
  }

  get type(): string {
    return this.#type;
  }

  get status(): WorkflowInstanceStatus {
    return this.#status;
  }

  get requestData(): Record<string, string> {
    return this.#requestData ? { ...this.#requestData } : {};
  }

  get currentStepDefId(): string | undefined {
    return this.#currentStepDefId;
  }

  get steps(): ReadonlyArray<WorkflowStep> {
    return [...this.#steps];
  }

  get actualSteps(): ReadonlyArray<WorkflowStep> {
    const actual: WorkflowStep[] = [];
    if (this.#steps.length === 0) return actual;

    // Follow the steps that have actually been started or completed
    return this.#steps
      .filter((s) => s.orderIndex >= 0)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  get initiatedBy(): Partial<User> | undefined {
    return this.#initiatedBy;
  }

  get initiatedFor(): Partial<User> | undefined {
    return this.#initiatedFor;
  }

  get completedAt(): Date | undefined {
    return this.#completedAt;
  }

  get remarks(): string | undefined {
    return this.#remarks;
  }

  get isDelegated(): boolean {
    return this.#initiatedBy?.id !== this.#initiatedFor?.id;
  }
  get isExternalUser(): boolean | undefined {
    return this.#isExternalUser;
  }
  get externalUserEmail(): string | undefined {
    return this.#externalUserEmail;
  }
  get context(): Record<string, any> | undefined {
    return this.#context;
  }
}
