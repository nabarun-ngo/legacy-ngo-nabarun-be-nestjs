import { SetMetadata } from "@nestjs/common";
import { JobName } from "src/shared/job-names";

export const PROCESS_JOB_KEY = "process_job";

export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

export interface ProcessJobOptions {
  /**
   * Unique name of the job to process.
   */
  name: JobName;

  /**
   * Number of times to retry a failed job.
   * Handled internally by BullMQ.
   */
  attempts: number;

  /**
   * Backoff strategy for retries.
   */
  backoff: {
    type: "fixed" | "exponential" | "linear";
    delay: number;
  };

  /**
   * Maximum time the job is allowed to run (in milliseconds).
   */
  timeout?: number;

  /**
   * Callback executed on each retry attempt.
   */
  onRetry?: (attemptNumber: number, error: Error) => void | Promise<void>;

  /**
   * Callback executed when the job has exhausted all retry attempts.
   */
  onFailed?: (error: Error, attemptsMade: number) => void | Promise<void>;

  /**
   * Job priority (1 = highest, 5 = lowest).
   */
  priority?: JobPriority;
}

/**
 * Decorator to register a method as a BullMQ job processor.
 * The decorated method should accept a BullMQ Job object and an optional token string as arguments.
 */
export const ProcessJob = (options: ProcessJobOptions) =>
  SetMetadata(PROCESS_JOB_KEY, options);
