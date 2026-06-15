import { Controller,Delete,Get,Param,Post,Query } from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiParam,
ApiQuery,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import { RequirePermissions } from "../../../auth/application/decorators/require-permissions.decorator";
import { JobService } from "../../application/services/job.service";
import { JobDetail,QueueStatistics } from "../dto/job.dto";

@ApiTags(JobController.name)
@Controller("jobs")
@ApiBearerAuth("jwt")
@ApiSecurity("api-key")
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiOperation({ summary: "Get jobs by status" })
  @ApiQuery({ name: "pageIndex", required: true, description: "Page index" })
  @ApiQuery({ name: "pageSize", required: true, description: "Page size" })
  @ApiQuery({
    name: "status",
    required: true,
    description: "Status of the jobs to return",
    enum: [
      "completed",
      "failed",
      "paused",
      "delayed",
      "active",
      "waiting",
      "waiting-children",
    ],
  })
  @ApiQuery({ name: "jobId", required: false, description: "Filter by job ID" })
  @RequirePermissions("read:jobs")
  @ApiAutoPagedResponse(JobDetail, {
    status: 200,
    description: "Jobs retrieved successfully",
    isArray: true,
    wrapInSuccessResponse: true,
  })
  async getJobs(
    @Query("pageIndex") pageIndex: number,
    @Query("pageSize") pageSize: number,
    @Query("status")
    status:
      | "completed"
      | "failed"
      | "paused"
      | "delayed"
      | "active"
      | "waiting"
      | "waiting-children",
    @Query("jobId") jobId?: string,
  ) {
    const result = await this.jobService.getJobs(pageIndex, pageSize, {
      status: status as any,
      id: jobId,
    });
    return new SuccessResponse(result);
  }

  @Get("details/:jobId")
  @ApiOperation({ summary: "Get job details by ID" })
  @ApiParam({ name: "jobId", description: "ID of the job" })
  @RequirePermissions("read:jobs")
  @ApiAutoResponse(JobDetail, {
    status: 200,
    description: "Job details retrieved successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async getJobDetails(@Param("jobId") jobId: string) {
    return new SuccessResponse(await this.jobService.getJobDetails(jobId));
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get job performance metrics" })
  @RequirePermissions("read:jobs")
  @ApiAutoResponse(QueueStatistics, {
    status: 200,
    description: "Performance metrics retrieved successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async getPerformanceMetrics() {
    return new SuccessResponse(await this.jobService.getQueueStatistics());
  }

  @Post("clean-old-jobs")
  @ApiOperation({ summary: "Clean old jobs" })
  @RequirePermissions("delete:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "Jobs cleaned successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async cleanOldJobs() {
    const message = await this.jobService.cleanOldJobs();
    return new SuccessResponse(message);
  }

  @Post("queue/:operation")
  @ApiOperation({ summary: "Pause/Resume the queue" })
  @RequirePermissions("update:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "Options: pause, resume",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  @ApiParam({
    name: "operation",
    required: true,
    description: "Operation to trigger",
    enum: ["pause", "resume"],
  })
  async queueOperation(@Param("operation") operation: string) {
    await this.jobService.queueOperation(operation);
    return new SuccessResponse("Queue " + operation + "d successfully");
  }

  @Delete(":jobId")
  @ApiOperation({ summary: "Remove a job" })
  @ApiParam({ name: "jobId", description: "ID of the job to remove" })
  @RequirePermissions("delete:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "Job removed successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async removeJob(@Param("jobId") jobId: string) {
    await this.jobService.removeJob(jobId);
    return new SuccessResponse(`Job '${jobId}' removed successfully`);
  }

  @Post("retry/:jobId")
  @ApiOperation({ summary: "Retry a failed job" })
  @ApiParam({ name: "jobId", description: "ID of the failed job to retry" })
  @RequirePermissions("update:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "Job queued for retry successfully",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async retryJob(@Param("jobId") jobId: string) {
    await this.jobService.retryJob(jobId);
    return new SuccessResponse(`Job '${jobId}' has been queued for retry`);
  }

  @Post("retry-all-failed")
  @ApiOperation({ summary: "Retry all failed jobs" })
  @RequirePermissions("update:jobs")
  @ApiAutoResponse(String, {
    status: 200,
    description: "All failed jobs queued for retry",
    isArray: false,
    wrapInSuccessResponse: true,
  })
  async retryAllFailedJobs() {
    const result = await this.jobService.retryAllFailedJobs();
    return new SuccessResponse(
      `Retry operation complete. ${result.retriedCount} jobs retried, ${result.failedCount} jobs failed`,
    );
  }
}
