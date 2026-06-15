import { InjectQueue } from "@nestjs/bullmq";
import { Inject,Injectable,Logger,forwardRef } from "@nestjs/common";
import { JobType,Queue } from "bullmq";
import { config } from "src/config/app.config";
import { JobName } from "src/shared/job-names";
import { ProcessJobOptions } from "../../application/decorators/process-job.decorator";
import { Job,JobOptions } from "../../presentation/dto/job.dto";
import { JobProcessorRegistry } from "./job-processor-registry.service";

@Injectable()
export class JobProcessingService {
  private readonly logger = new Logger(JobProcessingService.name);

  constructor(
    @InjectQueue(config.jobProcessing.queueName)
    private readonly defaultQueue: Queue,
    @Inject(forwardRef(() => JobProcessorRegistry))
    private readonly registry: JobProcessorRegistry,
  ) {}

  /**
   * Add a job to the default queue
   */
  async addJob<T>(
    name: JobName,
    data: T,
    options?: JobOptions,
    queueName?: string,
  ): Promise<Job<T>> {
    try {
      this.logger.log(`Adding job: ${name} with data: ${JSON.stringify(data)}`);

      // 1. Get default options from the processor decorator
      const processorData = this.registry.getProcessor(name);
      const defaults: Partial<ProcessJobOptions> = processorData?.options || {};

      // 2. Merge options: Instance Override > Decorator Default > Service Defaults
      const mergedOptions: JobOptions = {
        attempts: options?.attempts ?? defaults.attempts,
        backoff: options?.backoff ?? (defaults.backoff as any),
        priority: options?.priority ?? defaults.priority,
        // timeout is handled manually by the registry/worker during processing
        ...options,
      };

      // 3. Set TTL based on job type and configuration
      const jobOptions = this.setJobTTL(mergedOptions);

      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      const job = await queue.add(name, data, jobOptions);
      this.logger.log(`Job added successfully with ID: ${job.id}`);
      return job as Job<T>;
    } catch (error) {
      this.logger.error(`Failed to add job: ${name}`, error);
      throw error;
    }
  }

  /**
   * Get a job by ID
   */
  async getJob<T>(
    jobId: string,
    queueName?: string,
  ): Promise<Job<T> | undefined> {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      const job = await queue.getJob(jobId);
      return job as Job<T> | undefined;
    } catch (error) {
      this.logger.error(`Failed to get job: ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string, queueName?: string): Promise<void> {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Job removed: ${jobId}`);
      } else {
        this.logger.warn(`Job not found: ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove job: ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, queueName?: string): Promise<void> {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      const job = await queue.getJob(jobId);

      if (!job) {
        this.logger.warn(`Job not found: ${jobId}`);
        throw new Error(`Job ${jobId} not found`);
      }

      const state = await job.getState();

      if (state !== "failed") {
        this.logger.warn(
          `Job ${jobId} is not in failed state (current state: ${state})`,
        );
        throw new Error(
          `Job ${jobId} is not in failed state. Current state: ${state}`,
        );
      }

      // Retry the job
      await job.retry();
      this.logger.log(`Job ${jobId} has been queued for retry`);
    } catch (error) {
      this.logger.error(`Failed to retry job: ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Clean completed and failed jobs
   */
  async cleanJobs(
    queueName?: string,
  ): Promise<{ completed: string[]; failed: string[] }> {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      // Get retention settings from environment variables
      const completedGrace = config.jobProcessing.removeOnComplete.age;
      const failedGrace = config.jobProcessing.removeOnFail.age;
      const completedCount = config.jobProcessing.removeOnComplete.count;
      const failedCount = config.jobProcessing.removeOnFail.count;

      const completedJobs = await queue.clean(
        completedGrace,
        completedCount,
        "completed",
      );
      const failedJobs = await queue.clean(failedGrace, failedCount, "failed");
      this.logger.log(`Cleaned completed and failed jobs`);
      return { completed: completedJobs, failed: failedJobs };
    } catch (error) {
      this.logger.error(`Failed to clean completed and failed jobs`, error);
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    try {
      await this.defaultQueue.pause();
      this.logger.log("Queue paused");
    } catch (error) {
      this.logger.error("Failed to pause queue", error);
      throw error;
    }
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    try {
      await this.defaultQueue.resume();
      this.logger.log("Queue resumed");
    } catch (error) {
      this.logger.error("Failed to resume queue", error);
      throw error;
    }
  }

  /**
   * Check if queue is paused
   */
  async isQueuePaused(): Promise<boolean> {
    try {
      return await this.defaultQueue.isPaused();
    } catch (error) {
      this.logger.error("Failed to check queue pause status", error);
      throw error;
    }
  }

  /**
   * Get jobs by status or ID
   */
  async getJobs(
    start: number,
    end: number,
    status?: JobType,
    jobId?: string,
    queueName?: string,
  ): Promise<{ jobs: Job<any>[]; count: number }> {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      if (jobId) {
        const job = await queue.getJob(jobId);
        return { jobs: job ? [job as Job<any>] : [], count: job ? 1 : 0 };
      }
      const jobs = await queue.getJobs(status, start, end);
      if (status) {
        const count = await queue.getJobCounts(status);
        return { jobs: jobs as Job<any>[], count: count[status] };
      }
      const count = await queue.getJobCounts();
      const totalCount = Object.values(count).reduce(
        (acc, count) => acc + count,
        0,
      );
      return { jobs: jobs as Job<any>[], count: totalCount };
    } catch (error) {
      this.logger.error(`Failed to get jobs for status: ${status}`, error);
      throw error;
    }
  }

  /**
   * Get job logs
   */
  async getJobLogs(
    jobId: string,
    queueName?: string,
  ): Promise<{ logs: string[]; count: number }> {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      return await queue.getJobLogs(jobId);
    } catch (error) {
      this.logger.error(`Failed to get logs for job: ${jobId}`, error);
      throw error;
    }
  }

  async getJobCounts(queueName?: string) {
    try {
      const queue = queueName ? this.getQueue(queueName) : this.defaultQueue;
      return await queue.getJobCounts();
    } catch (error) {
      this.logger.error(
        `Failed to get job counts for queue: ${queueName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Set TTL for jobs based on configuration
   */
  private setJobTTL(options?: JobOptions): JobOptions {
    return {
      ...options,
      removeOnComplete:
        options?.removeOnComplete ?? config.jobProcessing.removeOnComplete,
      removeOnFail: options?.removeOnFail ?? config.jobProcessing.removeOnFail,
    };
  }

  /**
   * Get a queue instance by name
   * This is a placeholder - in a real implementation, you'd manage multiple queues
   */
  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case config.jobProcessing.queueName:
        return this.defaultQueue;
      default:
        throw new Error(`Queue ${queueName} not found`);
    }
  }
}
