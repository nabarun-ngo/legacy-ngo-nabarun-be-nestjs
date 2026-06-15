import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
IsArray,
IsBoolean,
IsDefined,
IsEnum,
IsNotEmpty,
IsObject,
IsOptional,
IsString,
} from "class-validator";
import { KeyValueDto } from "src/shared/dto/KeyValue.dto";
import { TaskAssignmentStatus as TaskAssignmentStatusEnum } from "../../domain/model/task-assignment.model";
import { WorkflowInstanceStatus } from "../../domain/model/workflow-instance.model";
import { WorkflowStepStatus } from "../../domain/model/workflow-step.model";
import {
WorkflowTaskStatus,
WorkflowTaskType,
} from "../../domain/model/workflow-task.model";

export class StartWorkflowDto {
  @ApiProperty({
    description: "Workflow type (e.g., JOIN_REQUEST)",
    required: true,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: "Request data for the workflow", required: true })
  @IsDefined()
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiProperty({
    description: "User ID for whom the workflow is initiated",
    required: false,
  })
  @IsOptional()
  @IsString()
  requestedFor?: string;

  @ApiProperty({
    description:
      "Is external user (use only when requestedFor id is not available)",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  forExternalUser?: boolean;

  @ApiProperty({
    description: "External user email (use only when forExternalUser is true)",
    required: false,
  })
  @IsOptional()
  @IsString()
  externalUserEmail?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ description: "Task status", required: true })
  @IsDefined()
  @IsString()
  @IsEnum(WorkflowTaskStatus)
  @IsNotEmpty()
  status: WorkflowTaskStatus;

  @ApiPropertyOptional({
    description: "Remarks for task update",
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    description: "Result data from task completion",
    required: false,
  })
  @IsOptional()
  @IsObject()
  resultData?: Record<string, any>;
}

export class TaskAssignmentDto {
  @ApiProperty({ required: true })
  @IsDefined()
  id: string;

  @ApiProperty({ required: true })
  @IsDefined()
  taskId: string;

  @ApiProperty({ required: true })
  @IsDefined()
  assignedToId: string;

  @ApiProperty({ required: true })
  @IsDefined()
  assignedToName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  roleName: string | null;

  @ApiProperty({ required: true })
  @IsDefined()
  status: TaskAssignmentStatusEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  acceptedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  notes?: string;
}

export class WorkflowTaskDto {
  @ApiProperty({ required: true })
  @IsDefined()
  id: string;

  @ApiProperty({ required: true })
  @IsDefined()
  stepId: string;

  @ApiProperty({ required: true })
  @IsDefined()
  taskId: string;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  workflowId?: string;

  @ApiProperty({ required: true })
  @IsDefined()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string | null;

  @ApiProperty({ required: true })
  @IsDefined()
  type: WorkflowTaskType;

  @ApiProperty({ required: true })
  @IsDefined()
  status: WorkflowTaskStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  checklist?: string[];

  @ApiProperty({ required: true })
  @IsDefined()
  createdAt: Date;

  @ApiProperty({ required: true })
  @IsDefined()
  updatedAt: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  assignedToId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  assignedToName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  handler?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  jobId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  resultData?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  completedById?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  completedByName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  remarks?: string;

  @ApiProperty({ type: [TaskAssignmentDto], required: true })
  @IsDefined()
  assignments: TaskAssignmentDto[];

  @ApiProperty({ required: false })
  @IsBoolean()
  autoCloseable: boolean;
}

export class WorkflowStepDto {
  @ApiProperty({ required: true })
  @IsDefined()
  id: string;

  @ApiProperty({ required: true })
  @IsDefined()
  stepId: string;

  @ApiProperty({ required: true })
  @IsDefined()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  description?: string | null;

  @ApiProperty({ required: true })
  @IsDefined()
  status: WorkflowStepStatus;

  @ApiProperty({ required: true })
  @IsDefined()
  orderIndex: number;

  @ApiProperty({ required: false })
  @IsOptional()
  startedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  remarks?: string;

  @ApiProperty({ required: true })
  @IsDefined()
  createdAt: Date;

  @ApiProperty({ required: true })
  @IsDefined()
  updatedAt: Date;

  @ApiProperty({ type: [WorkflowTaskDto], required: true })
  @IsDefined()
  tasks: WorkflowTaskDto[];
}

export class WorkflowInstanceDto {
  @ApiProperty({ required: true })
  @IsDefined()
  id: string;

  @ApiProperty({ required: true })
  @IsDefined()
  type: string;

  description: string;

  @ApiProperty({ required: true })
  @IsDefined()
  status: WorkflowInstanceStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  currentStepId: string | null;

  @ApiProperty({ required: true })
  @IsDefined()
  requestData: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  resultData?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  initiatedById?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  initiatedByName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  initiatedForId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  initiatedForName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  remarks?: string;

  @ApiProperty({ required: true })
  @IsDefined()
  createdAt: Date;

  @ApiProperty({ required: true })
  @IsDefined()
  updatedAt: Date;

  @ApiProperty({ type: [WorkflowStepDto], required: true })
  @IsDefined()
  steps: WorkflowStepDto[];

  @ApiProperty({ type: [WorkflowStepDto], required: true })
  @IsDefined()
  expectedSteps: WorkflowStepDto[];

  @ApiProperty({ type: [WorkflowStepDto], required: true })
  @IsDefined()
  actualSteps: WorkflowStepDto[];
}

export class WorkflowRefDataDto {
  @ApiProperty()
  workflowTypes?: KeyValueDto[];
  @ApiProperty()
  visibleWorkflowTypes?: KeyValueDto[];
  @ApiProperty()
  workflowStatuses?: KeyValueDto[];
  @ApiProperty()
  workflowTaskStatuses?: KeyValueDto[];
  @ApiProperty()
  workflowTaskTypes?: KeyValueDto[];
  @ApiProperty()
  workflowStepStatuses?: KeyValueDto[];
  @ApiProperty()
  visibleTaskStatuses?: KeyValueDto[];

  @ApiProperty()
  outstandingTaskStatuses?: KeyValueDto[];

  @ApiProperty()
  completedTaskStatuses?: KeyValueDto[];
}

export class WorkflowFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  readonly workflowId?: string;

  @ApiPropertyOptional({ enum: WorkflowInstanceStatus })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  readonly status?: WorkflowInstanceStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  readonly type?: string[];

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsOptional()
  @IsEnum(["Y", "N"])
  readonly delegated?: "Y" | "N";
}

export class TaskFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  readonly taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  readonly workflowId?: string;

  @ApiPropertyOptional({ enum: WorkflowTaskType })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  readonly type?: WorkflowTaskType[];

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsOptional()
  @IsEnum(["Y", "N"])
  readonly completed?: "Y" | "N";
}
