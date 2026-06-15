import {
INestApplication,
LogLevel,
NestInterceptor,
RequestMethod,
ValidationPipe,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as bodyParser from "body-parser";
import compression from "compression";
import { NextFunction,Request,Response } from "express";
import { Configkey } from "src/shared/config-keys";
import { GlobalExceptionFilter } from "src/shared/filters/global-exception.filter";
import { TimingInterceptor } from "src/shared/interceptors/timing.interceptor";
import {
resolveTraceId,
traceStorage,
} from "src/shared/utilities/trace-context.util";
import { configureSwagger } from "./swagger.config";

const parseRetentionDays = (
  value: string | undefined,
  defaultValue: number,
): number => {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), 365)
    : defaultValue;
};

const completedJobRetentionDays = parseRetentionDays(
  process.env[Configkey.PROP_COMPLETED_JOB_RETENTION_DAYS],
  7,
);
const failedJobRetentionDays = parseRetentionDays(
  process.env[Configkey.PROP_FAILED_JOB_RETENTION_DAYS],
  30,
);

export const config = {
  app: {
    name: process.env[Configkey.APP_NAME] || "",
    port: parseInt(process.env.PORT || "8080", 10) || 8080,
    environment: process.env[Configkey.NODE_ENV] || "development",
    isProd: process.env[Configkey.NODE_ENV] === "prod",
    logLevel: (process.env[Configkey.LOG_LEVEL] || "log") as LogLevel,
    fileSize: "10mb",
  },
  database: {
    mongodbUrl: process.env[Configkey.MONGODB_URL],
    postgresUrl: process.env[Configkey.POSTGRES_URL],
    redisUrl: process.env[Configkey.REDIS_URL],
    auditedModels: ["Account", "Donation", "Expense", "Transaction", "Earning"],
  },

  cors: {
    origin: process.env[Configkey.CORS_ALLOWED_ORIGIN]?.split(","),
    credentials: true,
  },
  validation: new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: process.env.NODE_ENV === "prod",
  }),
  jobProcessing: {
    queueName: "default",
    removeOnComplete: {
      age: 3600 * 24 * completedJobRetentionDays,
      count: 500 * completedJobRetentionDays,
    },
    removeOnFail: {
      age: 3600 * 24 * failedJobRetentionDays,
      count: 50 * failedJobRetentionDays,
    },
  },
};

export function applyConfig(app: INestApplication) {
  // Trace context middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const traceId = resolveTraceId(req.headers);
    // Set traceId in response header for convenience
    res.setHeader("x-trace-id", traceId);
    traceStorage.run(
      {
        traceId,
        user: {
          userId: "system", // Default if not authenticated
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        },
      },
      () => next(),
    );
  });

  app.use(compression()); // Response compression

  // Global validation with transform and whitelist
  app.useGlobalPipes(config.validation);

  // Set global prefix BEFORE configuring Swagger so it picks up the prefix
  app.setGlobalPrefix("api", {
    exclude: [
      {
        path: "/callback/oauth/:provider",
        method: RequestMethod.GET,
      },
      {
        path: "/webhooks/fathom",
        method: RequestMethod.POST,
      },
    ],
  });

  // File Size configuration
  app.use(
    bodyParser.json({
      limit: config.app.fileSize,
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    bodyParser.urlencoded({ limit: config.app.fileSize, extended: true }),
  );

  // Global Interceptors
  const interceptors: NestInterceptor<any, any>[] = [];

  if (!config.app.isProd) {
    configureSwagger(app);
    interceptors.push(new TimingInterceptor());
  }

  app.enableCors(config.cors);
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(EventEmitter2)));
  app.useGlobalInterceptors(...interceptors);

  app.enableShutdownHooks();
}
