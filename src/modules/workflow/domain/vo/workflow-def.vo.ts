import { FieldDef } from "src/shared/models/custom-field-def";
import { WorkflowTaskType } from "../model/workflow-task.model";

// Base DTOs for reusability
export interface AssignedToDef {
  roleGroups?: string[];
  roleNames: string | string[];
}

export interface TaskDetailDef {
  assignedTo?: AssignedToDef;
  isAutoCloseable?: boolean;
  autoCloseCondition?: string;
  autoCloseRefId?: string;
  autoCloseEventName?: string;
  autoCloseResultData?: Record<string, any>;
  checklist?: string[];
  fields: FieldDef[];
}

// Task DTOs
export interface TaskDef {
  taskId: string;
  name: string;
  description: string;
  type: WorkflowTaskType;
  etaHours?: number;
  handler?: string; // only for AUTOMATIC tasks
  taskDetail?: TaskDetailDef; // only for MANUAL tasks
}

export interface StepTransitionsDef {
  condition: string | "default";
  nextStepId: string;
}

export interface StepDef {
  isDefault: boolean;
  stepId: string;
  name: string;
  description: string;
  tasks: TaskDef[];
  transitions: StepTransitionsDef[];
}

// Root Workflow DTO
export interface WorkflowDefinition {
  name: string;
  description: string;
  fields: FieldDef[];
  preCreationTasks: TaskDef[];
  steps: StepDef[];
}
