import { Injectable,Logger } from "@nestjs/common";
import * as AwsCronParser from "aws-cron-parser";
import cronstrue from "cronstrue";
import { isEmpty } from "lodash";
import { DateTime } from "luxon";
import { JobProcessingService } from "src/modules/shared/job-processing/infrastructure/services/job-processing.service";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { JobName } from "src/shared/job-names";
import { generateUniqueNDigitNumber } from "src/shared/utilities/password-util";
import { CronConfigService } from "../../infrastructure/services/cron-config.service";
import { CronLogStorageService } from "../../infrastructure/services/cron-log-storage.service";
import {
CronJobDto,
QueueDto,
SchedulerLogDto,
} from "../../presentation/dtos/cron-job.dto";

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly cronConfig: CronConfigService,
    private readonly logStorage: CronLogStorageService,
    private readonly jobProcessingService: JobProcessingService,
  ) {}

  /**
   * Trigger all scheduled jobs
   */
  async triggerScheduledJobs(timestamp?: string): Promise<SchedulerLogDto> {
    const now = timestamp ? new Date(timestamp) : new Date();
    const istTime = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    this.logger.log(
      `[CRON] Triggering scheduled jobs. Trigger DateTime: ${timestamp} -> Server DateTime: ${now.toISOString()} -> IST (interpreted): ${istTime}`,
    );

    const executed: QueueDto[] = [];
    const skipped: QueueDto[] = [];
    const CRON_JOBS = await this.cronConfig.fetchCronJobs();
    const triggerId = `T${generateUniqueNDigitNumber(4)}`;

    for (const job of CRON_JOBS) {
      if (this.shouldExecute(job.expression, now)) {
        const payload: any = {};
        if (job.inputData) {
          Object.assign(payload, job.inputData);
        }
        const jobName = this.resolveJobName(job.handler);
        if (!jobName) {
          this.logger.error(
            `[CRON] Job ${job.name} (handler: ${job.handler}) not found in JobName registry`,
          );
          skipped.push({
            jobName: job.name,
            remarks: "JOB_NOT_FOUND",
          });
          continue;
        }
        const jobQueue = await this.jobProcessingService.addJob(
          jobName,
          payload,
        );
        this.logger.log(
          `[CRON] Triggered job: ${job.name} with ID: ${jobQueue.id}`,
        );
        executed.push({
          jobName: job.name,
          id: jobQueue.id,
        });
      } else {
        this.logger.debug(
          `[CRON] Skipped job: ${job.name} because schedule not matched`,
        );
        skipped.push({
          jobName: job.name,
          remarks: "SCHEDULE_NOT_MATCHED",
        });
      }
    }
    const triggerAt = new Date();
    await this.logStorage.addCronLog({
      triggerId: triggerId,
      triggerAt: triggerAt,
      executedJobs: executed,
      skippedJobs: skipped,
    });

    return {
      triggerId,
      triggerAt,
      executedJobs: executed,
      skippedJobs: skipped,
    };
  }

  /**
   * Get all scheduled jobs
   */
  async getScheduledJobs(): Promise<CronJobDto[]> {
    return (await this.cronConfig.fetchCronJobs())
      .filter((f) => f.enabled)
      .map((m) => {
        return {
          name: m.name,
          description: m.description,
          handler: m.handler,
          enabled: m.enabled,
          expression: m.expression,
          readableExpression: cronstrue.toString(
            this.normalizeToQuartz(m.expression),
          ),
          nextRun: this.calculateNextRun(m.expression, new Date()),
          inputData: m.inputData,
        } as CronJobDto;
      });
  }

  /**
   * Get all cron logs
   */
  async getGlobalCronTriggerLogs(
    pageIndex: number | undefined,
    pageSize: number | undefined,
  ) {
    return await this.logStorage.getGlobalLogs(pageIndex, pageSize);
  }

  /**
   * Run a specific cron job manually
   */
  async runScheduledJob(name: string, inputData?: any) {
    const job = (await this.cronConfig.fetchCronJobs()).find(
      (f) => f.name === name,
    );
    if (!job) {
      throw new BusinessException(
        `Job ${name} not found OR Not in active state`,
      );
    }
    const payload: any = {};
    if (inputData || job.inputData) {
      const data = isEmpty(inputData) ? job.inputData : inputData;
      Object.assign(payload, data);
    }
    const jobName = this.resolveJobName(job.handler);
    if (!jobName) {
      throw new BusinessException(
        `Job ${name} has an invalid handler: ${job.handler}`,
      );
    }
    const jobQueue = await this.jobProcessingService.addJob(jobName, payload);
    this.logger.log(
      `[CRON] Triggered job: ${job.name} with ID: ${jobQueue.id}`,
    );
    const triggerId = `MT${generateUniqueNDigitNumber(4)}`;
    await this.logStorage.addCronLog({
      triggerId: triggerId,
      triggerAt: new Date(),
      executedJobs: [
        {
          jobName: job.name,
          id: jobQueue.id,
        },
      ],
      skippedJobs: [],
    });
    return jobQueue.id;
  }

  /**
   * Check if a cron expression should execute at the given time
   */
  private shouldExecute(expression: string, intendedTime: Date): boolean {
    try {
      const searchStart = new Date(intendedTime.getTime() - 60000);
      const nextRun = this.calculateNextRun(expression, searchStart);

      const diffSeconds =
        Math.abs(nextRun.getTime() - intendedTime.getTime()) / 1000;
      const match = diffSeconds < 60;

      this.logger.debug(
        `[CRON] Evaluating: "${expression}". ` +
          `Next scheduled: ${nextRun.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST. ` +
          `Trigger time: ${intendedTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST. ` +
          `Diff: ${diffSeconds.toFixed(1)}s. Match: ${match}`,
      );

      return match;
    } catch (error) {
      this.logger.error(
        `Invalid cron expression: ${expression} ${error.stack}`,
      );
      return false;
    }
  }

  private calculateNextRun(expression: string, fromDate: Date): Date {
    const normalized = this.normalizeToQuartz(expression);

    const istDate = DateTime.fromJSDate(fromDate).setZone("Asia/Kolkata");
    const dateForParser = new Date(
      Date.UTC(
        istDate.year,
        istDate.month - 1,
        istDate.day,
        istDate.hour,
        istDate.minute,
        istDate.second,
      ),
    );

    try {
      const occurrence = AwsCronParser.parse(normalized);
      const nextDateUTC = AwsCronParser.next(occurrence, dateForParser);

      if (!nextDateUTC) {
        throw new Error(
          `Could not calculate next run for expression: ${expression} (normalized: ${normalized})`,
        );
      }

      const resultIST = DateTime.fromObject(
        {
          year: nextDateUTC.getUTCFullYear(),
          month: nextDateUTC.getUTCMonth() + 1,
          day: nextDateUTC.getUTCDate(),
          hour: nextDateUTC.getUTCHours(),
          minute: nextDateUTC.getUTCMinutes(),
          second: nextDateUTC.getUTCSeconds(),
        },
        { zone: "Asia/Kolkata" },
      );

      return resultIST.toJSDate();
    } catch (error) {
      this.logger.error(
        `[CRON] Error parsing expression "${expression}": ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Normalize standard 5-part UNIX cron to 6-part Quartz/AWS format
   */
  private normalizeToQuartz(expression: string): string {
    const parts = expression.trim().split(/\s+/);

    if (parts.length === 5) {
      // Minutes Hours DayMonth Month DayWeek
      // In Quartz, either DayOfMonth or DayOfWeek must be '?'
      if (parts[2] === "*" && parts[4] === "*") {
        parts[4] = "?";
      } else if (parts[2] === "*") {
        parts[2] = "?";
      } else if (parts[4] === "*") {
        parts[4] = "?";
      }
      parts.push("*"); // Add Year field
    }

    return parts.join(" ");
  }

  /**
   * Resolve JobName from either key or value
   */
  private resolveJobName(handler: string): JobName | undefined {
    // 1. Try treating it as a value
    if (Object.values(JobName).includes(handler as JobName)) {
      return handler as JobName;
    }
    // 2. Try treating it as a key
    return JobName[handler as keyof typeof JobName];
  }
}
