import { BaseEntity } from "../../../database/redis-store.service";

export interface CronExecution extends BaseEntity {
  jobName: string;
  executedAt: Date;
  duration: number;
  trigger: "AUTOMATIC" | "MANUAL";
  status: "SUCCESS" | "FAILED" | "TRIGGERED";
  error?: string;
  result?: any;
  executionLogs: string[];
}

export interface CronJob {
  name: string;
  expression: string; // simplified cron: "*/30 * * * *"
  description: string;
  handler: string; // method name in service
  enabled: boolean;
  inputData?: any;
}
