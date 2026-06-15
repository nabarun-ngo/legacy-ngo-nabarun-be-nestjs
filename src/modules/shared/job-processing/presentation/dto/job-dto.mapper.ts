import { Job } from "bullmq";
import { JobDetail } from "./job.dto";

export async function toJobDTO(
  job: Job<any, any, string>,
  logs?: string[],
): Promise<JobDetail> {
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    opts: job.opts,
    state: await job.getState(),
    progress: job.progress ?? 0,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason ?? "",
    processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
    timestamp: job.timestamp ? new Date(job.timestamp) : undefined,
    attemptsMade: job.attemptsMade,
    delay: job.delay,
    stacktrace: job.stacktrace,
    logs: logs ?? [],
  };
}
