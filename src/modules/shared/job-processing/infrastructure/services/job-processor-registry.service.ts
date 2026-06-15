import { InjectQueue } from "@nestjs/bullmq";
import {
Injectable,
Logger,
OnApplicationBootstrap,
OnModuleDestroy,
} from "@nestjs/common";
import { ModuleRef,Reflector } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Job as BullJob,Queue,WaitingChildrenError,Worker } from "bullmq";
import { config } from "src/config/app.config";
import { AppTechnicalError } from "src/modules/shared/observability/application/events/app-technical-error.event";
import { JobName } from "src/shared/job-names";
import {
PROCESS_JOB_KEY,
ProcessJobOptions,
} from "../../application/decorators/process-job.decorator";
import {
Job,
JobExecutionContext,
JobOptions,
JobProcessor,
} from "../../presentation/dto/job.dto";

@Injectable()
export class JobProcessorRegistry
  implements OnModuleDestroy, OnApplicationBootstrap
{
  private readonly logger = new Logger(JobProcessorRegistry.name);
  private readonly processors = new Map<
    string,
    { processor: JobProcessor; options: ProcessJobOptions }
  >();
  private worker: Worker | null = null;
  private isShuttingDown = false;

  constructor(
    @InjectQueue(config.jobProcessing.queueName)
    private readonly defaultQueue: Queue,
    private readonly moduleRef: ModuleRef,
    private readonly reflector: Reflector,
    private readonly eventBus: EventEmitter2,
  ) {}

  async onApplicationBootstrap() {
    // All modules are loaded now, discover processors
    await this.discoverAndRegisterProcessors();
    await this.initializeWorker();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    await this.shutdown();
  }

  /**
   * Discover and register all processors with @ProcessJob decorator
   */
  private async discoverAndRegisterProcessors() {
    const startTime = Date.now();
    const modules = this.moduleRef["container"].getModules();
    let processorsFound = 0;

    this.logger.log(
      `Starting processor discovery... (${modules.size} modules found)`,
    );

    for (const [moduleName, module] of modules) {
      this.logger.debug(`Scanning module: ${moduleName}`);

      for (const [providerName, provider] of module.providers) {
        if (!provider?.instance || typeof provider.instance !== "object")
          continue;

        const instance = provider.instance;
        const prototype = Object.getPrototypeOf(instance);
        const className = instance.constructor.name;

        // Get all methods
        const methods = Object.getOwnPropertyNames(prototype);

        for (const methodName of methods) {
          if (
            typeof instance[methodName] !== "function" ||
            methodName === "constructor"
          ) {
            continue;
          }

          // Try to get metadata from the method descriptor
          const methodRef = prototype[methodName];
          if (methodRef) {
            const options = this.reflector.get<ProcessJobOptions>(
              PROCESS_JOB_KEY,
              methodRef,
            );

            if (options) {
              this.logger.log(
                `✓ Found processor: ${options.name} in ${className}.${methodName}`,
              );
              this.registerProcessor(
                options,
                instance[methodName].bind(instance),
              );
              processorsFound++;
            }
          }
        }
      }
    }

    this.logger.log(
      `Discovered ${processorsFound} processors in ${Date.now() - startTime}ms`,
    );

    if (processorsFound === 0) {
      this.logger.warn("⚠️  No processors found! Make sure:");
      this.logger.warn(
        "   1. Services with @ProcessJob are in module providers",
      );
      this.logger.warn("   2. Modules are imported in AppModule");
      this.logger.warn("   3. Decorator uses PROCESS_JOB_KEY symbol");
    }
  }

  /**
   * Register a processor with its options
   */
  private registerProcessor(options: ProcessJobOptions, method: Function) {
    const processor: JobProcessor = async (
      job: Job,
      ctx: JobExecutionContext,
    ) => {
      return await method(job, ctx);
    };

    this.processors.set(options.name, { processor, options });
    this.logger.log(`Registered processor: ${options.name}`);
  }

  /**
   * Initialize a single optimized worker for all processors
   */
  private async initializeWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      config.jobProcessing.queueName,
      async (job: BullJob, token?: string) => this.processJob(job, token),
      {
        connection: this.defaultQueue.opts.connection,
        // Optimize for in-process execution
        lockDuration: 30000, // 30 seconds
        lockRenewTime: 15000, // Renew every 15 seconds
        stalledInterval: 60000, // OPTIMIZED: Increased from 30s to 60s to reduce Redis polling
        maxStalledCount: 2,
        settings: {},
        // Aggressive cleanup for in-process workers
        removeOnComplete: config.jobProcessing.removeOnComplete,
        removeOnFail: config.jobProcessing.removeOnFail,
      },
    );

    // Event handlers with minimal overhead
    this.worker.on("completed", (job) => {
      this.logger.log(`✓ Completed: ${job.name}:${job.id}`);
    });

    this.worker.on("failed", (job, error) => {
      this.logger.error(`✗ ${job?.name}:${job?.id} - ${error.message}`);
    });

    this.worker.on("error", (error) => {
      this.logger.error(`Worker error: ${error.message}`);
    });

    this.logger.log(`Worker initialized`);
  }

  /**
   * Process a job by routing to the appropriate processor with enhanced error handling
   */
  private async processJob(job: BullJob, token?: string): Promise<any> {
    if (this.isShuttingDown) {
      throw new Error("Worker is shutting down");
    }

    // Auto-completion for jobs that have awakened from a waiting-children state
    if (job.data._internal_isWaitingOnChildren) {
      this.logger.log(
        `Job ${job.id} resumed after waiting for children. Auto-completing parent job.`,
      );
      const cleanData = { ...job.data };
      delete cleanData._internal_isWaitingOnChildren;
      await job.updateData(cleanData);
      return;
    }

    const processorData = this.processors.get(job.name);

    if (!processorData) {
      this.logger.warn(`No processor registered for: ${job.name}`);
      throw new Error(`No processor found for job type: ${job.name}`);
    }

    const startTime = Date.now();
    const attemptNumber = (job.attemptsMade || 0) + 1;
    const maxAttempts = job.opts.attempts || 3;

    // Buffer for dynamic child jobs
    const childrenToSpawn: { name: string; data: any; options?: JobOptions }[] =
      [];
    const ctx: JobExecutionContext = {
      addChildJob: <T = Record<string, any>>(
        name: JobName,
        data: T,
        options?: JobOptions,
      ): string => {
        const jobId = options?.jobId || `${job.id}-C${childrenToSpawn.length}`;
        childrenToSpawn.push({ name, data, options: { ...options, jobId } });
        return jobId;
      },
    };

    try {
      job.log(
        `Starting Processing: ${job.name}:${job.id} (attempt ${attemptNumber}/${maxAttempts})`,
      );

      // Apply timeout if configured
      const timeout = processorData.options.timeout;
      let result: any;

      if (timeout) {
        result = await this.executeWithTimeout(
          processorData.processor(job as unknown as Job, ctx),
          timeout,
          job.name,
        );
      } else {
        result = await processorData.processor(job as unknown as Job, ctx);
      }

      const duration = Date.now() - startTime;
      job.log(`[SUCCESS] Completed: ${job.name}:${job.id} after ${duration}ms`);

      // Process buffered child jobs and properly suspend the parent
      if (childrenToSpawn.length > 0) {
        this.logger.log(
          `Job ${job.id} spawning ${childrenToSpawn.length} children and entering waiting state.`,
        );

        // Save state to auto-skip the processor logic when awakening next time
        await job.updateData({
          ...job.data,
          _internal_isWaitingOnChildren: true,
        });

        for (const child of childrenToSpawn) {
          const childOpts = {
            ...child.options,
            parent: {
              id: job.id!,
              queue:
                job.queueQualifiedName ||
                (await this.defaultQueue
                  .waitUntilReady()
                  .then(() => this.defaultQueue.qualifiedName)),
            },
          };
          await this.defaultQueue.add(child.name, child.data, childOpts);
        }

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          throw new WaitingChildrenError();
        } else {
          // If it doesn't wait, clear the flag quickly so it doesn't pollute data
          const cleanData = { ...job.data };
          delete cleanData._internal_isWaitingOnChildren;
          await job.updateData(cleanData);
          this.logger.log(
            `Job ${job.id} did not transition into waiting state (children might have completed instantly)`,
          );
        }
      }

      return result;
    } catch (error) {
      if (error instanceof WaitingChildrenError) {
        throw error; // Let BullMQ handle the lock release silently
      }

      const duration = Date.now() - startTime;
      job.log(
        `[ERROR] Failed: ${job.name}:${job.id} after ${duration}ms - ${attemptNumber}:${error.message}`,
      );
      this.eventBus.emit(AppTechnicalError.name, new AppTechnicalError(error));
      // Call retry/failed callbacks
      if (processorData.options.onRetry && attemptNumber < maxAttempts) {
        try {
          await processorData.options.onRetry(attemptNumber, error);
        } catch {}
      }
      if (processorData.options.onFailed && attemptNumber >= maxAttempts) {
        try {
          await processorData.options.onFailed(error, attemptNumber);
        } catch {}
      }

      throw error;
    }
  }

  /**
   * Execute processor with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    jobName: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`Job ${jobName} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Unregister a processor
   */
  unregisterProcessor(name: string) {
    const existed = this.processors.delete(name);
    if (existed) {
      this.logger.log(`Unregistered: ${name}`);
    }
    return existed;
  }

  /**
   * Get all registered processor names
   */
  getRegisteredProcessors(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if a processor exists
   */
  isProcessorRegistered(name: string): boolean {
    return this.processors.has(name);
  }

  /**
   * Get processor details
   */
  getProcessor(name: string) {
    return this.processors.get(name);
  }

  /**
   * Get current worker status and metrics
   */
  async getMetrics() {
    if (!this.worker) {
      return {
        isRunning: false,
        totalProcessors: this.processors.size,
        processors: this.getRegisteredProcessors(),
      };
    }

    return {
      isRunning: this.worker.isRunning(),
      isPaused: this.worker.isPaused(),
      totalProcessors: this.processors.size,
      processors: this.getRegisteredProcessors(),
    };
  }

  /**
   * Graceful shutdown
   */
  private async shutdown() {
    this.logger.log("Shutting down worker...");

    if (this.worker) {
      try {
        // Wait for active jobs to complete (max 30 seconds)
        await Promise.race([
          this.worker.close(),
          new Promise((resolve) => setTimeout(resolve, 30000)),
        ]);
        this.logger.log("Worker closed gracefully");
      } catch (error) {
        this.logger.error("Error closing worker:", error);
      }
      this.worker = null;
    }

    this.processors.clear();
  }
}
