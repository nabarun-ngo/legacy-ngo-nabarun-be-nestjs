import { Injectable,Logger } from "@nestjs/common";
import { JobType } from "bullmq";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { PagedResult } from "src/shared/models/paged-result";
import { JobProcessingService } from "../../infrastructure/services/job-processing.service";
import { toJobDTO } from "../../presentation/dto/job-dto.mapper";
import {
JobDetail,
JobMetrics,
JobPerformanceMetrics,
QueueHealth,
} from "../../presentation/dto/job.dto";

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(private readonly jobProcessingService: JobProcessingService) {}

  /**
   * Get job details
   */
  async getJobDetails(jobId: string): Promise<JobDetail> {
    const job = await this.jobProcessingService.getJob(jobId);
    if (!job) {
      throw new BusinessException("Job not found with id " + jobId);
    }
    const logs = await this.jobProcessingService.getJobLogs(jobId);
    return await toJobDTO(job, logs.logs);
  }

  /**
   * Get jobs with pagination and optional filtering
   */
  async getJobs(
    pageIndex: number,
    pageSize: number,
    filter: {
      status?: JobType;
      id?: string;
    },
  ) {
    try {
      const page = pageIndex || 0;
      const size = pageSize || 10;
      const start = page * size;
      const end = page * size + size - 1;

      // Use infra service to get jobs
      const { jobs, count } = await this.jobProcessingService.getJobs(
        start,
        end,
        filter.status,
        filter.id,
      );

      const jobDetails = (
        await Promise.all(jobs.map(async (job) => await toJobDTO(job)))
      ).sort((a, b) => {
        if (a.state === "completed" && b.state !== "completed") return 1;
        if (a.state !== "completed" && b.state === "completed") return -1;
        return 0;
      });
      return new PagedResult(jobDetails, count, page, size);
    } catch (error) {
      this.logger.error("Failed to get jobs", error);
      throw error;
    }
  }

  /**
   * Clean old jobs based on criteria
   */
  async cleanOldJobs() {
    try {
      return await this.jobProcessingService.cleanJobs();
    } catch (error) {
      this.logger.error("Failed to clean old jobs", error);
      throw error;
    }
  }

  /**
   * Retry all failed jobs
   */
  async retryAllFailedJobs(): Promise<{
    retriedCount: number;
    failedCount: number;
  }> {
    try {
      const failedJobs = (
        await this.jobProcessingService.getJobs(0, 1000, "failed")
      ).jobs;
      let retriedCount = 0;
      let failedCount = 0;

      this.logger.log(`Found ${failedJobs.length} failed jobs to retry`);

      for (const job of failedJobs) {
        try {
          await job.retry();
          retriedCount++;
          this.logger.log(`Retried job: ${job.id}`);
        } catch (error) {
          failedCount++;
          this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
        }
      }
      this.logger.log(
        `Retry complete: ${retriedCount} succeeded, ${failedCount} failed`,
      );
      return { retriedCount, failedCount };
    } catch (error) {
      this.logger.error("Failed to retry all failed jobs", error);
      throw error;
    }
  }

  /**
   * Retry a specific job
   */
  async retryJob(jobId: string) {
    await this.jobProcessingService.retryJob(jobId);
  }

  /**
   * Remove a specific job
   */
  async removeJob(jobId: string) {
    await this.jobProcessingService.removeJob(jobId);
  }

  /**
   * Get queue operation
   */
  async queueOperation(operation: string) {
    switch (operation) {
      case "pause":
        await this.jobProcessingService.pauseQueue();
        break;
      case "resume":
        await this.jobProcessingService.resumeQueue();
        break;
      default:
        throw new BusinessException("Invalid operation");
    }
  }

  /**
   * Get queue statistics for monitoring dashboard
   */
  async getQueueStatistics() {
    try {
      const metrics = await this.getJobMetrics();
      const [performance, health] = await Promise.all([
        this.getJobPerformanceMetrics(),
        this.getQueueHealth(metrics),
      ]);

      return {
        metrics,
        performance,
        health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to get queue statistics", error);
      throw error;
    }
  }

  /**
   * Get job performance metrics (optimized to limit data fetching)
   */
  private async getJobPerformanceMetrics(): Promise<JobPerformanceMetrics> {
    try {
      // Only fetch last 100 completed jobs instead of ALL jobs - huge optimization!
      const completedJobs = (
        await this.jobProcessingService.getJobs(0, 1000, "completed")
      ).jobs;

      if (completedJobs.length === 0) {
        return {
          averageProcessingTime: 0,
          fastestJob: 0,
          slowestJob: 0,
          totalProcessingTime: 0,
        } as JobPerformanceMetrics;
      }

      const processingTimes = completedJobs
        .map((job) => {
          const finishedOn = job.finishedOn;
          const processedOn = job.processedOn;
          return finishedOn && processedOn ? finishedOn - processedOn : 0;
        })
        .filter((time) => time > 0);

      if (processingTimes.length === 0) {
        return {
          averageProcessingTime: 0,
          fastestJob: 0,
          slowestJob: 0,
          totalProcessingTime: 0,
        } as JobPerformanceMetrics;
      }

      const totalProcessingTime = processingTimes.reduce(
        (sum, time) => sum + time,
        0,
      );
      const averageProcessingTime =
        totalProcessingTime / processingTimes.length;
      const fastestJob = Math.min(...processingTimes);
      const slowestJob = Math.max(...processingTimes);

      return {
        averageProcessingTime: Math.round(averageProcessingTime),
        fastestJob,
        slowestJob,
        totalProcessingTime,
      } as JobPerformanceMetrics;
    } catch (error) {
      this.logger.error("Failed to get job performance metrics", error);
      throw error;
    }
  }

  /**
   * Get comprehensive job metrics (optimized with caching and count methods)
   */
  private async getJobMetrics(): Promise<JobMetrics> {
    try {
      const jobCounts = await this.jobProcessingService.getJobCounts();
      const total = Object.values(jobCounts).reduce((a, b) => a + b, 0);
      const successRate = total > 0 ? (jobCounts.completed / total) * 100 : 0;
      const failureRate = total > 0 ? (jobCounts.failed / total) * 100 : 0;

      const metrics: JobMetrics = {
        total,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        active: jobCounts["active"],
        waiting: jobCounts["waiting"],
        delayed: jobCounts["delayed"],
        waitingChildren: jobCounts["waiting-children"],
        completed: jobCounts["completed"],
        failed: jobCounts["failed"],
      };
      return metrics;
    } catch (error) {
      this.logger.error("Failed to get job metrics", error);
      throw error;
    }
  }

  /**
   * Get queue health status
   */
  private async getQueueHealth(metrics: JobMetrics): Promise<QueueHealth> {
    try {
      const isPaused = await this.jobProcessingService.isQueuePaused();
      const healthStatus: QueueHealth = {
        status: "healthy",
        isPaused,
        issues: [] as string[],
      };

      // Check for potential issues
      if (metrics.failureRate > 50) {
        healthStatus.status = "unhealthy";
        healthStatus.issues.push("High failure rate detected");
      }

      if (metrics.waiting > 100) {
        healthStatus.status = "degraded";
        healthStatus.issues.push("High number of waiting jobs");
      }

      if (isPaused) {
        healthStatus.status = "paused";
        healthStatus.issues.push("Queue is paused");
      }

      return healthStatus;
    } catch (error) {
      this.logger.error("Failed to get queue health", error);
      return {
        status: "error",
        isPaused: false,
        issues: ["Failed to retrieve queue health data"],
      };
    }
  }
}
