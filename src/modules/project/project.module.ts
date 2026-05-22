import { Module } from '@nestjs/common';

// Repositories
import { ProjectRepository } from './infrastructure/persistence/project.repository';
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository.interface';
import { ActivityRepository } from './infrastructure/persistence/activity.repository';
import { ACTIVITY_REPOSITORY } from './domain/repositories/activity.repository.interface';
import { BeneficiaryRepository } from './infrastructure/persistence/beneficiary.repository';
import { BENEFICIARY_REPOSITORY } from './domain/repositories/beneficiary.repository.interface';

// Use Cases
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case';
import { CreateActivityUseCase } from './application/use-cases/create-activity.use-case';
import { LinkExpenseToActivityUseCase } from './application/use-cases/link-expense-to-activity.use-case';
import { UpdateActivityUseCase } from './application/use-cases/update-activity.use-case';

// Services
import { ProjectService } from './application/services/project.service';

// Controllers
import { ProjectController } from './presentation/controllers/project.controller';
import { FirebaseModule } from '../shared/firebase/firebase.module';
import { DocumentGeneratorModule } from '../shared/document-generator/document-generator.module';
import { ProjectReportProvider } from './application/providers/reports/project-report.provider';
import { ActivityReportProvider } from './application/providers/reports/activity-report.provider';

@Module({
  imports: [FirebaseModule, DocumentGeneratorModule],
  controllers: [ProjectController],
  providers: [
    // Repositories
    {
      provide: PROJECT_REPOSITORY,
      useClass: ProjectRepository,
    },
    {
      provide: ACTIVITY_REPOSITORY,
      useClass: ActivityRepository,
    },
    {
      provide: BENEFICIARY_REPOSITORY,
      useClass: BeneficiaryRepository,
    },
    // Use Cases
    CreateProjectUseCase,
    UpdateProjectUseCase,
    CreateActivityUseCase,
    LinkExpenseToActivityUseCase,
    UpdateActivityUseCase,
    ProjectReportProvider,
    ActivityReportProvider,
    // Services
    ProjectService,
  ],
  exports: [ProjectService],
})
export class ProjectModule { }

