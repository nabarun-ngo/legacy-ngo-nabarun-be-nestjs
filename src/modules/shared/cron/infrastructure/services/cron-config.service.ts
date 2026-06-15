import { Injectable } from "@nestjs/common";
import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";
import { parseKeyValueConfigs } from "src/shared/utilities/kv-config.util";
import { CronJob } from "../../domain/models/cron-job.model";

@Injectable()
export class CronConfigService {
  constructor(private readonly firebaseRC: RemoteConfigService) {}

  async fetchCronJobs(): Promise<CronJob[]> {
    const config = await this.firebaseRC.getAllKeyValues();
    if (!config["CRON_JOBS"]) return [];

    const cronJobs = parseKeyValueConfigs(config["CRON_JOBS"].value);

    return cronJobs.map((m) => {
      return {
        name: m.KEY,
        expression: m.VALUE,
        description: m.DESCRIPTION,
        // handler can be a JobName enum value (e.g. 'send-onboarding-email')
        // or a JobName enum key (e.g. 'SEND_ONBOARDING_EMAIL')
        handler: m.getAttribute("EVENT_NAME"),
        enabled: m.ACTIVE,
        inputData: m.getAttribute("INPUT_DATA")
          ? m.getAttribute("INPUT_DATA")
          : undefined,
      } as CronJob;
    });
  }
}
