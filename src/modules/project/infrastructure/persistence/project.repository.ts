import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { Project,ProjectFilterProps } from "../../domain/model/project.model";
import { IProjectRepository } from "../../domain/repositories/project.repository.interface";
import { ProjectInfraMapper } from "../project-infra.mapper";

@Injectable()
class ProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: ProjectFilterProps): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.project.count({ where });
  }

  async findPaged(
    filter?: BaseFilter<ProjectFilterProps>,
  ): Promise<PagedResult<Project>> {
    const where = this.whereQuery(filter?.props);

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          manager: true,
          sponsor: true,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.project.count({ where }),
    ]);

    return new PagedResult<Project>(
      data.map((m) => ProjectInfraMapper.toProjectDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: ProjectFilterProps): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: this.whereQuery(filter),
      orderBy: { createdAt: "desc" },
      include: {
        manager: true,
        sponsor: true,
      },
    });

    return projects.map((m) => ProjectInfraMapper.toProjectDomain(m)!);
  }

  private whereQuery(props?: ProjectFilterProps): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {
      ...(props?.status ? { status: props.status } : {}),
      ...(props?.category ? { category: props.category } : {}),
      ...(props?.phase ? { phase: props.phase } : {}),
      ...(props?.managerId ? { managerId: props.managerId } : {}),
      ...(props?.sponsorId ? { sponsorId: props.sponsorId } : {}),
      ...(props?.location
        ? { location: { contains: props.location, mode: "insensitive" } }
        : {}),
      ...(props?.tags && props.tags.length > 0
        ? { tags: { hasSome: props.tags } }
        : {}),
      deletedAt: null,
    };
    return where;
  }

  async findById(id: string): Promise<Project | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return ProjectInfraMapper.toProjectDomain(project);
  }

  async findByCode(code: string): Promise<Project | null> {
    const project = await this.prisma.project.findUnique({
      where: { code },
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return ProjectInfraMapper.toProjectDomain(project);
  }

  async findByStatus(status: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { status, deletedAt: null },
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return projects.map((m) => ProjectInfraMapper.toProjectDomain(m)!);
  }

  async findByCategory(category: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { category, deletedAt: null },
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return projects.map((m) => ProjectInfraMapper.toProjectDomain(m)!);
  }

  async findByManagerId(managerId: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { managerId, deletedAt: null },
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return projects.map((m) => ProjectInfraMapper.toProjectDomain(m)!);
  }

  async findByPhase(phase: string): Promise<Project[]> {
    const projects = await this.prisma.project.findMany({
      where: { phase, deletedAt: null },
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return projects.map((m) => ProjectInfraMapper.toProjectDomain(m)!);
  }

  async create(project: Project): Promise<Project> {
    const created = await this.prisma.project.create({
      data: ProjectInfraMapper.toProjectCreatePersistence(project),
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return ProjectInfraMapper.toProjectDomain(created)!;
  }

  async update(id: string, project: Project): Promise<Project> {
    const updated = await this.prisma.project.update({
      where: { id },
      data: ProjectInfraMapper.toProjectUpdatePersistence(project),
      include: {
        manager: true,
        sponsor: true,
      },
    });
    return ProjectInfraMapper.toProjectDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export { ProjectRepository };
