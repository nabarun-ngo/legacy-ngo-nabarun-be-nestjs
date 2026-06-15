import { Module } from "@nestjs/common";

// Repositories
import { ACTIVITY_REPOSITORY } from "./domain/repositories/activity.repository.interface";
import { BENEFICIARY_REPOSITORY } from "./domain/repositories/beneficiary.repository.interface";
import { PROJECT_REPOSITORY } from "./domain/repositories/project.repository.interface";
import { ActivityRepository } from "./infrastructure/persistence/activity.repository";
import { BeneficiaryRepository } from "./infrastructure/persistence/beneficiary.repository";
import { ProjectRepository } from "./infrastructure/persistence/project.repository";

// Use Cases
import { CreateActivityUseCase } from "./application/use-cases/create-activity.use-case";
import { CreateProjectUseCase } from "./application/use-cases/create-project.use-case";
import { LinkExpenseToActivityUseCase } from "./application/use-cases/link-expense-to-activity.use-case";
import { UpdateActivityUseCase } from "./application/use-cases/update-activity.use-case";
import { UpdateProjectUseCase } from "./application/use-cases/update-project.use-case";

// Services
import { ProjectService } from "./application/services/project.service";

// Controllers
import { FinanceModule } from "../finance/finance.module";
import { DocumentGeneratorModule } from "../shared/document-generator/document-generator.module";
import { FirebaseModule } from "../shared/firebase/firebase.module";
import { ActivityEventsHandler } from "./application/handlers/activity-events.handler";
import { ActivityReportProvider } from "./application/providers/reports/activity-report.provider";
import { ProjectReportProvider } from "./application/providers/reports/project-report.provider";
import { ProjectController } from "./presentation/controllers/project.controller";

@Module({
  imports: [FirebaseModule, DocumentGeneratorModule, FinanceModule],
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
    ActivityEventsHandler,
    // Services
    ProjectService,
  ],
  exports: [],
})
export class ProjectModule {}
