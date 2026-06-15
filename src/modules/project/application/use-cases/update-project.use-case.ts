import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { Project } from "../../domain/model/project.model";
import type { IProjectRepository } from "../../domain/repositories/project.repository.interface";
import { PROJECT_REPOSITORY } from "../../domain/repositories/project.repository.interface";
import { UpdateProjectDto } from "../dto/project.dto";
import { UpdateActivityUseCase } from "./update-activity.use-case";

@Injectable()
export class UpdateProjectUseCase
  implements IUseCase<{ id: string; data: UpdateProjectDto }, Project>
{
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    private readonly updateActivityUseCase: UpdateActivityUseCase,
  ) {}

  async execute(request: {
    id: string;
    data: UpdateProjectDto;
  }): Promise<Project> {
    const project = await this.projectRepository.findById(request.id);
    if (!project) {
      throw new BusinessException("Project not found");
    }

    // Update domain entity
    project.update(request.data);

    // Handle status update separately if provided
    if (request.data.status) {
      project.updateStatus(request.data.status);
    }

    // Handle phase update separately if provided
    if (request.data.phase) {
      project.updatePhase(request.data.phase);
    }

    // Save to repository
    return await this.projectRepository.update(request.id, project);
  }
}
