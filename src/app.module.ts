import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import Handlebars from "handlebars";
import helpers from "handlebars-helpers";
import { DateTime } from "luxon";
//import { PrismaClient } from "@prisma/client";

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
    // EventEmitterModule.forRoot({
    //   wildcard: true,
    //   delimiter: ".",
    //   maxListeners: 10,
    //   verboseMemoryLeak: false,
    // }),
    // JobProcessingModule.forRoot({
    //   connection: {
    //     url: config.database.redisUrl,
    //   },
    // }),

    // UserModule,
    // AuthModule,
    // WorkflowModule,
    // FinanceModule,
    // DMSModule,
    // DocumentGeneratorModule,
    // PublicModule,
    // ProjectModule,
    // CorrespondenceModule,
    // MeetingModule,
    // CronModule,
    // CommentsModule,
    // ReportingModule,
    // StaticDocsModule,
    // ObservabilityModule,

    // /**
    //  * New Configurations
    //  */
    // DatabaseModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (c: ConfigService) =>
    //   ({
    //     postgresUrl: c.getOrThrow(Configkey.POSTGRES_URL),
    //     redisUrl: c.getOrThrow(Configkey.REDIS_URL),
    //     prismaClientFactory: (url: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }),
    //     auditedModels: [],
    //     cacheStoreTtl: 200,
    //     failOnAuditError: false
    //   } as DatabaseModuleOptions)
    // })
  ],
  providers: [],
})
export class AppModule { }
