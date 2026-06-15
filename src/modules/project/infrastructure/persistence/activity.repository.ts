import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
Activity,
ActivityFilterProps,
} from "../../domain/model/activity.model";
import { IActivityRepository } from "../../domain/repositories/activity.repository.interface";
import { ProjectInfraMapper } from "../project-infra.mapper";

@Injectable()
class ActivityRepository implements IActivityRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: ActivityFilterProps): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.activity.count({ where });
  }

  async findPaged(
    filter?: BaseFilter<ActivityFilterProps>,
  ): Promise<PagedResult<Activity>> {
    const where = this.whereQuery(filter?.props);

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          project: true,
          assignee: true,
          organizer: true,
          parentActivity: true,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return new PagedResult<Activity>(
      data.map((m) => ProjectInfraMapper.toActivityDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: ActivityFilterProps): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: this.whereQuery(filter),
      orderBy: { createdAt: "desc" },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  private whereQuery(props?: ActivityFilterProps): Prisma.ActivityWhereInput {
    return {
      ...(props?.projectId ? { projectId: props.projectId } : {}),
      ...(props?.scale ? { scale: props.scale } : {}),
      ...(props?.status ? { status: props.status } : {}),
      ...(props?.type ? { type: props.type } : {}),
      ...(props?.assignedTo ? { assignedTo: props.assignedTo } : {}),
      ...(props?.organizerId ? { organizerId: props.organizerId } : {}),
      ...(props?.parentActivityId
        ? { parentActivityId: props.parentActivityId }
        : {}),
      deletedAt: null,
    };
  }

  async findById(id: string): Promise<Activity | null> {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return ProjectInfraMapper.toActivityDomain(activity);
  }

  async findByProjectId(projectId: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { projectId, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async findByStatus(status: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { status, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async findByScale(scale: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { scale, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async findByType(type: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { type, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async findByAssignedTo(userId: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { assignedTo: userId, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async findByOrganizerId(organizerId: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { organizerId, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async findByParentActivityId(parentActivityId: string): Promise<Activity[]> {
    const activities = await this.prisma.activity.findMany({
      where: { parentActivityId, deletedAt: null },
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return activities.map((m) => ProjectInfraMapper.toActivityDomain(m)!);
  }

  async create(activity: Activity): Promise<Activity> {
    const created = await this.prisma.activity.create({
      data: ProjectInfraMapper.toActivityCreatePersistence(activity),
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return ProjectInfraMapper.toActivityDomain(created)!;
  }

  async update(id: string, activity: Activity): Promise<Activity> {
    const updated = await this.prisma.activity.update({
      where: { id },
      data: ProjectInfraMapper.toActivityUpdatePersistence(activity),
      include: {
        project: true,
        assignee: true,
        organizer: true,
        parentActivity: true,
      },
    });
    return ProjectInfraMapper.toActivityDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export { ActivityRepository };
