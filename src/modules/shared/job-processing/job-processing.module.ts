import { BullModule } from "@nestjs/bullmq";
import { DynamicModule,Global,Module } from "@nestjs/common";
import { config } from "src/config/app.config";
import { JobService } from "./application/services/job.service";
import { JobProcessingService } from "./infrastructure/services/job-processing.service";
import { JobProcessorRegistry } from "./infrastructure/services/job-processor-registry.service";
import { JobController } from "./presentation/controllers/job.controller";

export interface JobProcessingModuleOptions {
  connection: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: {
    removeOnComplete?: { age?: number; count?: number } | number;
    removeOnFail?: { age?: number; count?: number } | number;
    attempts?: number;
    backoff?: { type: "fixed" | "exponential"; delay: number };
  };
  queues?: string[]; // queue names to register; defaults to ['default']
}

@Global()
@Module({})
export class JobProcessingModule {
  static forRoot(options: JobProcessingModuleOptions): DynamicModule {
    const queueNames =
      options.queues && options.queues.length > 0
        ? options.queues
        : ["default"];
    const queueConfigs = queueNames.map((name) => ({ name }));
    return {
      module: JobProcessingModule,
      imports: [
        BullModule.forRoot({
          connection: options.connection,
          defaultJobOptions: options.defaultJobOptions,
        }),
        BullModule.registerQueue(...queueConfigs),
        BullModule.registerFlowProducer({
          name: config.jobProcessing.queueName + "-flow-producer",
        }),
      ],
      providers: [JobProcessingService, JobProcessorRegistry, JobService],
      exports: [JobProcessingService],
      controllers: [JobController],
    };
  }
}
