import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { WorkflowController } from './presentation/controllers/workflow.controller';
import { StartWorkflowUseCase } from './application/use-cases/start-workflow.use-case';
import { CompleteTaskUseCase } from './application/use-cases/complete-task.use-case';
import { WorkflowService } from './application/services/workflow.service';
import WorkflowInstanceRepository from './infrastructure/persistence/workflow-instance.repository';
import {
  WORKFLOW_INSTANCE_REPOSITORY,
} from './domain/repositories/workflow-instance.repository.interface';
import { WorkflowJobProcessor } from './application/handlers/workflow-job.processor';
import { JobProcessingModule } from '../shared/job-processing/job-processing.module';
import { FirebaseModule } from '../shared/firebase/firebase.module';
import { WorkflowDefService } from './infrastructure/external/workflow-def.service';
import { WorkflowEventsHandler } from './application/handlers/workflow-event.handler';
import { StartWorkflowStepUseCase } from './application/use-cases/start-workflow-step.use-case';
import { ReassignTaskUseCase } from './application/use-cases/reassign-task.use-case';
import { AutomaticTaskService } from './application/services/automatic-task.service';
import { ValidateInputsHandler } from './application/automatic-task-handlers/validate-inputs.handler';
import { AutomaticTaskRegistryService } from './application/services/automatic-task-registry.service';
import { CancelWorkflowUseCase } from './application/use-cases/cancel-workflow.use-case';

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
  ],
  exports: [
    WorkflowService, // TODO make it internal
    WORKFLOW_INSTANCE_REPOSITORY,
    StartWorkflowUseCase,
    AutomaticTaskRegistryService,
  ],
})
export class WorkflowModule { }

