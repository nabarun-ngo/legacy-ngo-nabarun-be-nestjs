import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { config } from "./config/app.config";
import { FinanceModule } from "./modules/finance/finance.module";
import { ProjectModule } from "./modules/project/project.module";
import { PublicModule } from "./modules/public/public.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { AuthModule } from "./modules/shared/auth/auth.module";
import { CommentsModule } from "./modules/shared/comments/comments.module";
import { CorrespondenceModule } from "./modules/shared/correspondence/correspondence.module";
import { CronModule } from "./modules/shared/cron/cron.module";
import { DatabaseModule } from "./modules/shared/database/database.module";
import { DMSModule } from "./modules/shared/dms/dms.module";
import { DocumentGeneratorModule } from "./modules/shared/document-generator/document-generator.module";
import { JobProcessingModule } from "./modules/shared/job-processing/job-processing.module";
import { MeetingModule } from "./modules/shared/meeting/meeting.module";
import { ObservabilityModule } from "./modules/shared/observability/observability.module";
import { StaticDocsModule } from "./modules/shared/static-docs/static-docs.module";
import { UserModule } from "./modules/user/user.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";

import Handlebars from "handlebars";
import helpers from "handlebars-helpers";
import { DateTime } from "luxon";

// Register all helpers
helpers({ handlebars: Handlebars });
//Custom helpers
Handlebars.registerHelper("formatDate", function (date, format) {
  if (!date) return "";
  return DateTime.fromISO(date.toString()).toFormat(format);
});
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("and", (a, b) => a && b);
Handlebars.registerHelper("or", (a, b) => a || b);
Handlebars.registerHelper("not", (a) => !a);

@Module({
  controllers: [],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true, // Memory optimization
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ".",
      maxListeners: 10,
      verboseMemoryLeak: false,
    }),
    JobProcessingModule.forRoot({
      connection: {
        url: config.database.redisUrl,
      },
    }),
    DatabaseModule.forRoot({
      postgresUrl: config.database.postgresUrl,
      redisUrl: config.database.redisUrl,
    }),
    UserModule,
    AuthModule,
    WorkflowModule,
    FinanceModule,
    DMSModule,
    DocumentGeneratorModule,
    PublicModule,
    ProjectModule,
    CorrespondenceModule,
    MeetingModule,
    CronModule,
    CommentsModule,
    ReportingModule,
    StaticDocsModule,
    ObservabilityModule,
  ],
  providers: [],
})
export class AppModule {}
