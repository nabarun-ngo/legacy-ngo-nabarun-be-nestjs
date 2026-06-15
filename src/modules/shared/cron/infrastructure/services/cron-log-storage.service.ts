import { Injectable } from "@nestjs/common";
import { config } from "src/config/app.config";
import { RedisStoreService } from "src/modules/shared/database/redis-store.service";
import { PagedResult } from "src/shared/models/paged-result";
import { CronExecution } from "../../domain/models/cron-job.model";
import { SchedulerLogDto } from "../../presentation/dtos/cron-job.dto";

@Injectable()
export class CronLogStorageService {
  private readonly NS = "cron:jobs";
  private readonly GLOBAL_KEY = "global";
  private readonly INDEXED_FIELDS: (keyof CronExecution)[] = [
    "status",
    "id",
    "jobName",
  ];

  constructor(private readonly store: RedisStoreService) {}

  // Execution logs — stored as bounded list on the job's hash key
  async addLog(log: CronExecution): Promise<void> {
    await this.store.save(this.NS, log, {
      indexes: this.INDEXED_FIELDS,
      ttl:
        log.status === "SUCCESS"
          ? config.jobProcessing.removeOnComplete.age
          : config.jobProcessing.removeOnFail.age,
    });
  }

  async getLogs(
    jobName?: string,
    pageIndex: number = 0,
    pageSize: number = 10,
  ): Promise<PagedResult<CronExecution>> {
    return this.store.findAll(this.NS, {
      cursor: `${pageIndex * pageSize}`,
      count: pageSize,
      filter: jobName ? { field: "jobName", value: jobName } : undefined,
      sortBy: "desc",
    });
  }

  async getLog(id: string): Promise<CronExecution | null> {
    return await this.store.findById(this.NS, id);
  }

  // Global execution summaries
  async addCronLog(log: SchedulerLogDto): Promise<void> {
    await this.store.pushToTimeline(
      this.NS,
      this.GLOBAL_KEY,
      {
        ...log,
        triggerAt: log.triggerAt.toISOString(),
      },
      1000,
    );
  }

  async getGlobalLogs(
    pageIndex: number = 0,
    pageSize: number = 10,
  ): Promise<PagedResult<SchedulerLogDto>> {
    const start = pageIndex * pageSize;
    const end = start + pageSize - 1;

    const [items, totalSize] = await Promise.all([
      this.store.getTimeline<SchedulerLogDto>(this.NS, this.GLOBAL_KEY, {
        start,
        end,
      }),
      this.store.timelineLength(this.NS, this.GLOBAL_KEY),
    ]);

    return new PagedResult<SchedulerLogDto>(
      items,
      totalSize,
      pageIndex,
      pageSize,
    );
  }
}
