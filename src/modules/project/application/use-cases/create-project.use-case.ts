import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
  Project,
  ProjectPhase,
  ProjectStatus,
} from "../../domain/model/project.model";
import type { IProjectRepository } from "../../domain/repositories/project.repository.interface";
import { PROJECT_REPOSITORY } from "../../domain/repositories/project.repository.interface";
import { CreateProjectDto } from "../dto/project.dto";

@Injectable()
export class CreateProjectUseCase
  implements IUseCase<CreateProjectDto, Project> {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(request: CreateProjectDto): Promise<Project> {
    // Check if project code already exists
    const existingProject = await this.projectRepository.findByCode(
      request.code,
    );
    if (existingProject) {
      throw new BusinessException("Project with this code already exists");
    }

    // Create domain entity
    const project = Project.create({
      name: request.name,
      description: request.description,
      code: request.code,
      category: request.category,
      status: request.status || ProjectStatus.PLANNING,
      phase: request.phase || ProjectPhase.INITIATION,
      startDate: request.startDate,
      endDate: request.endDate,
      budget: request.budget,
      currency: request.currency,
      location: request.location,
      targetBeneficiaryCount: request.targetBeneficiaryCount,
      managerId: request.managerId,
      sponsorId: request.sponsorId,
      tags: request.tags,
      metadata: request.metadata,
    });

    // Save to repository
    await this.projectRepository.create(project);

    // Emit domain events
    for (const event of project.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    project.clearEvents();

    return project;
  }
}
