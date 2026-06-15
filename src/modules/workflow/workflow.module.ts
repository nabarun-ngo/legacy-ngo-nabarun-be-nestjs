import { Global,Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { FirebaseModule } from "../shared/firebase/firebase.module";
import { JobProcessingModule } from "../shared/job-processing/job-processing.module";
import { ValidateInputsHandler } from "./application/automatic-task-handlers/validate-inputs.handler";
import { DomainEventCacheHandler } from "./application/handlers/domain-event-cache.handler";
import { WorkflowEventsHandler } from "./application/handlers/workflow-event.handler";
import { WorkflowJobProcessor } from "./application/handlers/workflow-job.processor";
import { AutomaticTaskRegistryService } from "./application/services/automatic-task-registry.service";
import { AutomaticTaskService } from "./application/services/automatic-task.service";
import { WorkflowFacade } from "./application/services/workflow-facade.service";
import { WorkflowService } from "./application/services/workflow.service";
import { CancelWorkflowUseCase } from "./application/use-cases/cancel-workflow.use-case";
import { CompleteTaskUseCase } from "./application/use-cases/complete-task.use-case";
import { ReassignTaskUseCase } from "./application/use-cases/reassign-task.use-case";
import { StartWorkflowStepUseCase } from "./application/use-cases/start-workflow-step.use-case";
import { StartWorkflowUseCase } from "./application/use-cases/start-workflow.use-case";
import { WORKFLOW_INSTANCE_REPOSITORY } from "./domain/repositories/workflow-instance.repository.interface";
import { WorkflowDefService } from "./infrastructure/external/workflow-def.service";
import WorkflowInstanceRepository from "./infrastructure/persistence/workflow-instance.repository";
import { WorkflowController } from "./presentation/controllers/workflow.controller";

@Global()
@Module({
  imports: [DiscoveryModule, JobProcessingModule, FirebaseModule],
  controllers: [WorkflowController],
  providers: [
    StartWorkflowUseCase,
    CompleteTaskUseCase,
    WorkflowService,
    {
      provide: WORKFLOW_INSTANCE_REPOSITORY,
      useClass: WorkflowInstanceRepository,
    },
    WorkflowJobProcessor,
    WorkflowDefService,
    WorkflowEventsHandler,
    StartWorkflowStepUseCase,
    ReassignTaskUseCase,
    AutomaticTaskService,
    AutomaticTaskRegistryService,
    ValidateInputsHandler,
    CancelWorkflowUseCase,
    DomainEventCacheHandler,
    WorkflowFacade,
  ],
  exports: [WorkflowFacade],
})
export class WorkflowModule {}
