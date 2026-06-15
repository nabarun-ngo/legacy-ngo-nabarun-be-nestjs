import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import {
JobPriority,
ProcessJob,
} from "src/modules/shared/job-processing/application/decorators/process-job.decorator";
import { JobName } from "src/shared/job-names";
import { resolveJobParams } from "src/shared/utilities/job-param-resolver.util";
import { ReportingService } from "../../services/reporting.service";

@Injectable()
export class ReportJobsProvider {
  constructor(private readonly reportingService: ReportingService) {}

  @ProcessJob({
    name: JobName.TriggerReportJobEvent,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    priority: JobPriority.NORMAL,
  })
  async handleReportGeneration(job: Job) {
    const { reportCode, params, authUserId } = job.data;
    const userId = authUserId || "system";
    job.log(
      `[INFO] Processing report generation for: ${reportCode} by ${userId}`,
    );

    const resolvedParams = resolveJobParams(params);

    try {
      await this.reportingService.generateReport(
        reportCode,
        resolvedParams,
        userId,
      );
      job.log(`[INFO] Successfully generated report: ${reportCode}`);
    } catch (error) {
      job.log(
        `[ERROR] Failed to generate report: ${reportCode}. Error: ${error.message}`,
      );
      throw error;
    }
  }
}
