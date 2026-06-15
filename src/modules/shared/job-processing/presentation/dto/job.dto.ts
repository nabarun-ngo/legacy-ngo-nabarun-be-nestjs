import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
// Import BullMQ's types
import * as bullmq from "bullmq";
import {
IsArray,
IsBoolean,
IsDate,
IsNumber,
IsObject,
IsOptional,
IsString
} from "class-validator";
import { JobName } from "src/shared/job-names";

// Re-export BullMQ's types as our types with better generic support
export type JobOptions = bullmq.JobsOptions;
export type Job<TData = unknown, TResult = unknown> = bullmq.Job<
  TData,
  TResult
>;
export interface JobExecutionContext {
  addChildJob: <T = any>(
    name: JobName,
    data: T,
    options?: JobOptions,
  ) => string;
}
export type JobProcessor<TData = unknown, TResult = unknown> = (
  job: Job<TData, TResult>,
  ctx: JobExecutionContext,
) => Promise<TResult>;
export interface JobData {
  [key: string]: any;
}

export class JobMetrics {
  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiProperty()
  @IsNumber()
  completed: number;

  @ApiProperty()
  @IsNumber()
  failed: number;

  @ApiProperty()
  @IsNumber()
  active: number;

  @ApiProperty()
  @IsNumber()
  waiting: number;

  @ApiProperty()
  @IsNumber()
  delayed: number;

  //'completed', 'failed', 'delayed', 'active', 'waiting', 'waiting-children', 'unknown'
  @ApiProperty()
  @IsNumber()
  waitingChildren: number;

  @ApiProperty()
  @IsNumber()
  successRate: number;

  @ApiProperty()
  @IsNumber()
  failureRate: number;
}

export class JobPerformanceMetrics {
  @ApiProperty()
  @IsNumber()
  averageProcessingTime: number;

  @ApiProperty()
  @IsNumber()
  fastestJob: number;

  @ApiProperty()
  @IsNumber()
  slowestJob: number;

  @ApiProperty()
  @IsNumber()
  totalProcessingTime: number;
}

export class JobDetail {
  @ApiPropertyOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsObject()
  data: JobData;

  @ApiProperty()
  @IsObject()
  opts: JobOptions;

  @ApiProperty()
  @IsObject()
  state: bullmq.JobState | "unknown";

  @ApiProperty()
  @IsObject()
  progress: bullmq.JobProgress;

  @ApiProperty({ required: false })
  @IsOptional()
  returnvalue: unknown;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  failedReason: string;

  @ApiPropertyOptional()
  @IsDate()
  processedOn?: Date;

  @ApiPropertyOptional()
  @IsDate()
  finishedOn?: Date;

  @ApiPropertyOptional()
  @IsDate()
  timestamp?: Date;

  @ApiProperty()
  @IsNumber()
  attemptsMade: number;

  @ApiProperty()
  @IsNumber()
  delay: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  stacktrace: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  logs?: string[];
}

export class QueueHealth {
  @ApiProperty()
  @IsString()
  status: "healthy" | "unhealthy" | "degraded" | "paused" | "error";

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  issues: string[];

  @ApiProperty()
  @IsBoolean()
  isPaused: boolean;
}

export class QueueStatistics {
  @ApiProperty()
  @IsObject()
  metrics: JobMetrics;

  @ApiProperty()
  @IsObject()
  performance: JobPerformanceMetrics;

  @ApiProperty()
  @IsObject()
  health: QueueHealth;

  @ApiProperty()
  @IsDate()
  timestamp: Date;
}
