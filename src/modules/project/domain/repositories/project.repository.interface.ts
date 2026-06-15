import { IRepository } from "src/shared/interfaces/repository.interface";
import { Project,ProjectFilterProps } from "../model/project.model";

export interface IProjectRepository
  extends IRepository<Project, string, ProjectFilterProps> {
  findById(id: string): Promise<Project | null>;
  findByCode(code: string): Promise<Project | null>;
  findByStatus(status: string): Promise<Project[]>;
  findByCategory(category: string): Promise<Project[]>;
  findByManagerId(managerId: string): Promise<Project[]>;
  findByPhase(phase: string): Promise<Project[]>;
  create(project: Project): Promise<Project>;
  update(id: string, project: Project): Promise<Project>;
  delete(id: string): Promise<void>;
  findAll(filter?: ProjectFilterProps): Promise<Project[]>;
}

export const PROJECT_REPOSITORY = Symbol("PROJECT_REPOSITORY");
