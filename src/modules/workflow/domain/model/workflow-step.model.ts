import { randomUUID } from "crypto";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { BaseDomain } from "../../../../shared/models/base-domain";
import { StepDef,StepTransitionsDef } from "../vo/workflow-def.vo";
import { WorkflowTask } from "./workflow-task.model";

export enum WorkflowStepStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export class WorkflowStep extends BaseDomain<string> {
  // 🔒 Pure private fields
  #stepDefId: string;
  #name: string;
  #description: string;
  #status: WorkflowStepStatus;
  #orderIndex: number;
  #transitions: StepTransitionsDef[] = [];

  #completedAt?: Date;
  #remarks?: string;
  #startedAt?: Date;

  #tasks: WorkflowTask[] = [];

  constructor(
    id: string,
    stepDefId: string,
    name: string,
    description: string,
    status: WorkflowStepStatus,
    orderIndex: number,
    transitions: StepTransitionsDef[] = [],
    completedAt?: Date,
    remarks?: string,
    startedAt?: Date,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);

    this.#stepDefId = stepDefId;
    this.#name = name;
    this.#description = description;
    this.#status = status;
    this.#orderIndex = orderIndex;
    this.#transitions = transitions;

    this.#completedAt = completedAt;
    this.#remarks = remarks;
    this.#startedAt = startedAt;
  }

  // -----------------------------------
  //        Factory
  // -----------------------------------

  static create(step: StepDef): WorkflowStep {
    const instance = new WorkflowStep(
      randomUUID(),
      step.stepId,
      step.name,
      step.description,
      WorkflowStepStatus.PENDING,
      step.isDefault ? 0 : -1,
      step.transitions,
    );

    return instance;
  }

  // -----------------------------------
  //        Private methods
  // -----------------------------------

  // -----------------------------------
  //        Mutators
  // -----------------------------------

  setTasks(tasks: WorkflowTask[]) {
    this.#tasks = [...tasks];
    this.touch();
  }

  start() {
    if (
      this.#status === WorkflowStepStatus.COMPLETED ||
      this.#status === WorkflowStepStatus.FAILED
    ) {
      throw new BusinessException(
        `Cannot start step in status: ${this.#status}`,
      );
    }
    this.#status = WorkflowStepStatus.IN_PROGRESS;
    this.#startedAt = new Date();
    this.touch();
  }

  set currentOrderIndex(index: number) {
    this.#orderIndex = index;
    this.touch();
  }

  complete() {
    if (this.#status !== WorkflowStepStatus.IN_PROGRESS) {
      throw new BusinessException(
        `Cannot complete step in status: ${this.#status}`,
      );
    }
    this.#status = WorkflowStepStatus.COMPLETED;
    this.#completedAt = new Date();
    this.touch();
    //Updating All Task level context here
    // return this.#onSuccessStepId;
  }

  fail(reason: string) {
    this.#status = WorkflowStepStatus.FAILED;
    this.#remarks = reason;
    this.touch();
    //return this.#onFailureStepId;
  }

  skip() {
    this.#status = WorkflowStepStatus.SKIPPED;
    this.touch();
  }

  // -----------------------------------
  //        Read-only API
  // -----------------------------------

  get stepDefId() {
    return this.#stepDefId;
  }

  get name() {
    return this.#name;
  }

  get description() {
    return this.#description;
  }

  get status() {
    return this.#status;
  }

  get orderIndex() {
    return this.#orderIndex;
  }

  get tasks(): ReadonlyArray<WorkflowTask> {
    return [...this.#tasks];
  }

  get completedAt() {
    return this.#completedAt;
  }

  get remarks() {
    return this.#remarks;
  }

  get startedAt() {
    return this.#startedAt;
  }

  get transitions(): ReadonlyArray<StepTransitionsDef> {
    return [...this.#transitions];
  }

  // -----------------------------------
  //        Query helpers
  // -----------------------------------

  isCompleted() {
    return this.#status === WorkflowStepStatus.COMPLETED;
  }

  isFailed() {
    return this.#status === WorkflowStepStatus.FAILED;
  }

  isAllTasksCompleted() {
    return this.#tasks.length > 0 && this.#tasks.every((t) => t.isCompleted());
  }
}
