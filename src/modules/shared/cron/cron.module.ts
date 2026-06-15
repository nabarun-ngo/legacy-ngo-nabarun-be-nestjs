import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { FirebaseModule } from "../firebase/firebase.module";
import { JobProcessingModule } from "../job-processing/job-processing.module";
import { CronService } from "./application/services/cron.service";
import { CronConfigService } from "./infrastructure/services/cron-config.service";
import { CronLogStorageService } from "./infrastructure/services/cron-log-storage.service";
import { CronController } from "./presentation/controllers/cron.controller";

@Module({
  imports: [FirebaseModule, DatabaseModule, JobProcessingModule],
  controllers: [CronController],
  providers: [CronService, CronLogStorageService, CronConfigService],
  exports: [],
})
export class CronModule {}
