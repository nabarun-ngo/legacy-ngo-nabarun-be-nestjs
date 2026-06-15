import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database/mapper-utils";
import {
Activity,
ActivityPriority,
ActivityScale,
ActivityStatus,
ActivityType,
} from "../domain/model/activity.model";
import {
Beneficiary,
BeneficiaryGender,
BeneficiaryStatus,
BeneficiaryType,
} from "../domain/model/beneficiary.model";
import {
Project,
ProjectCategory,
ProjectPhase,
ProjectStatus,
} from "../domain/model/project.model";
import {
ActivityPersistence,
BeneficiaryPersistence,
ProjectPersistence,
} from "./types/project-persistence.types";

/**
 * Project Infrastructure Mapper
 * Handles conversion between Prisma persistence models and Domain models
 */
export class ProjectInfraMapper {
  // ===== PROJECT MAPPERS =====

  static toProjectDomain(p: ProjectPersistence.Base | any): Project | null {
    if (!p) return null;
    return new Project(
      p.id,
      p.name,
      p.description,
      p.code,
      p.category as ProjectCategory,
      p.status as ProjectStatus,
      p.phase as ProjectPhase,
      p.managerId,
      p.startDate,
      MapperUtils.nullToUndefined(p.endDate),
      MapperUtils.nullToUndefined(p.actualEndDate),
      Number(p.budget),
      Number(p.spentAmount),
      p.currency,
      MapperUtils.nullToUndefined(p.location),
      MapperUtils.nullToUndefined(p.targetBeneficiaryCount),
      MapperUtils.nullToUndefined(p.actualBeneficiaryCount),
      MapperUtils.nullToUndefined(p.sponsorId),
      p.tags,
      p.metadata as Record<string, any>,
      p.createdAt,
      p.updatedAt,
    );
  }

  static toProjectCreatePersistence(
    domain: Project,
  ): Prisma.ProjectUncheckedCreateInput {
    return {
      id: domain.id,
      name: domain.name,
      description: domain.description,
      code: domain.code,
      category: domain.category,
      status: domain.status,
      phase: domain.phase,
      startDate: domain.startDate,
      endDate: MapperUtils.undefinedToNull(domain.endDate),
      actualEndDate: MapperUtils.undefinedToNull(domain.actualEndDate),
      budget: domain.budget ?? 0,
      spentAmount: domain.spentAmount ?? 0,
      currency: domain.currency,
      location: MapperUtils.undefinedToNull(domain.location),
      targetBeneficiaryCount: MapperUtils.undefinedToNull(
        domain.targetBeneficiaryCount,
      ),
      actualBeneficiaryCount: MapperUtils.undefinedToNull(
        domain.actualBeneficiaryCount,
      ),
      managerId: domain.managerId,
      sponsorId: MapperUtils.undefinedToNull(domain.sponsorId),
      tags: domain.tags,
      metadata: domain.metadata as Prisma.InputJsonValue,
      createdAt: domain.createdAt || new Date(),
      updatedAt: domain.updatedAt || new Date(),
      version: 0,
    };
  }

  static toProjectUpdatePersistence(
    domain: Project,
  ): Prisma.ProjectUncheckedUpdateInput {
    return {
      name: domain.name,
      description: domain.description,
      category: domain.category,
      status: domain.status,
      phase: domain.phase,
      endDate: MapperUtils.undefinedToNull(domain.endDate),
      actualEndDate: MapperUtils.undefinedToNull(domain.actualEndDate),
      budget: domain.budget,
      spentAmount: domain.spentAmount,
      location: MapperUtils.undefinedToNull(domain.location),
      targetBeneficiaryCount: MapperUtils.undefinedToNull(
        domain.targetBeneficiaryCount,
      ),
      actualBeneficiaryCount: MapperUtils.undefinedToNull(
        domain.actualBeneficiaryCount,
      ),
      sponsorId: MapperUtils.undefinedToNull(domain.sponsorId),
      tags: domain.tags,
      metadata: domain.metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    };
  }

  // ===== ACTIVITY MAPPERS =====

  static toActivityDomain(p: ActivityPersistence.Base | any): Activity | null {
    if (!p) return null;

    const activity = new Activity(
      p.id,
      p.projectId,
      p.name,
      p.scale as ActivityScale,
      p.type as ActivityType,
      p.status as ActivityStatus,
      p.priority as ActivityPriority,
      MapperUtils.nullToUndefined(p.description),
      MapperUtils.nullToUndefined(p.startDate),
      MapperUtils.nullToUndefined(p.endDate),
      MapperUtils.nullToUndefined(p.actualStartDate),
      MapperUtils.nullToUndefined(p.actualEndDate),
      MapperUtils.nullToUndefined(p.location),
      MapperUtils.nullToUndefined(p.venue),
      MapperUtils.nullToUndefined(p.assignedTo),
      MapperUtils.nullToUndefined(p.organizerId),
      MapperUtils.nullToUndefined(p.parentActivityId),
      MapperUtils.nullToUndefined(p.expectedParticipants),
      MapperUtils.nullToUndefined(p.actualParticipants),

      MapperUtils.nullToUndefined(Number(p.estimatedCost)),
      MapperUtils.nullToUndefined(Number(p.actualCost)),
      MapperUtils.nullToUndefined(p.currency),
      MapperUtils.nullToUndefined(p.tags),
      p.metadata as Record<string, any>,
      p.createdAt,
      p.updatedAt,
    );

    return activity;
  }

  static toActivityCreatePersistence(
    domain: Activity,
  ): Prisma.ActivityUncheckedCreateInput {
    return {
      id: domain.id,
      projectId: domain.projectId,
      name: domain.name,
      description: MapperUtils.undefinedToNull(domain.description),
      scale: domain.scale,
      type: domain.type,
      status: domain.status,
      priority: domain.priority,
      startDate: MapperUtils.undefinedToNull(domain.startDate),
      endDate: MapperUtils.undefinedToNull(domain.endDate),
      actualStartDate: MapperUtils.undefinedToNull(domain.actualStartDate),
      actualEndDate: MapperUtils.undefinedToNull(domain.actualEndDate),
      location: MapperUtils.undefinedToNull(domain.location),
      venue: MapperUtils.undefinedToNull(domain.venue),
      assignedTo: MapperUtils.undefinedToNull(domain.assignedTo),
      organizerId: MapperUtils.undefinedToNull(domain.organizerId),
      parentActivityId: MapperUtils.undefinedToNull(domain.parentActivityId),
      expectedParticipants: MapperUtils.undefinedToNull(
        domain.expectedParticipants,
      ),
      actualParticipants: MapperUtils.undefinedToNull(
        domain.actualParticipants,
      ),
      estimatedCost: MapperUtils.undefinedToNull(domain.estimatedCost),
      actualCost: MapperUtils.undefinedToNull(domain.actualCost),
      currency: MapperUtils.undefinedToNull(domain.currency),
      tags: domain.tags,
      metadata: domain.metadata as Prisma.InputJsonValue,
      createdAt: domain.createdAt || new Date(),
      updatedAt: domain.updatedAt || new Date(),
      version: 0,
    };
  }

  static toActivityUpdatePersistence(
    domain: Activity,
  ): Prisma.ActivityUncheckedUpdateInput {
    return {
      name: domain.name,
      description: MapperUtils.undefinedToNull(domain.description),
      type: domain.type,
      status: domain.status,
      priority: domain.priority,
      startDate: MapperUtils.undefinedToNull(domain.startDate),
      endDate: MapperUtils.undefinedToNull(domain.endDate),
      actualStartDate: MapperUtils.undefinedToNull(domain.actualStartDate),
      actualEndDate: MapperUtils.undefinedToNull(domain.actualEndDate),
      location: MapperUtils.undefinedToNull(domain.location),
      venue: MapperUtils.undefinedToNull(domain.venue),
      assignedTo: MapperUtils.undefinedToNull(domain.assignedTo),
      organizerId: MapperUtils.undefinedToNull(domain.organizerId),
      parentActivityId: MapperUtils.undefinedToNull(domain.parentActivityId),
      expectedParticipants: MapperUtils.undefinedToNull(
        domain.expectedParticipants,
      ),
      actualParticipants: MapperUtils.undefinedToNull(
        domain.actualParticipants,
      ),
      estimatedCost: MapperUtils.undefinedToNull(domain.estimatedCost),
      actualCost: MapperUtils.undefinedToNull(domain.actualCost),
      currency: MapperUtils.undefinedToNull(domain.currency),
      tags: domain.tags,
      metadata: domain.metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    };
  }

  // ===== BENEFICIARY MAPPERS =====

  static toBeneficiaryDomain(
    p: BeneficiaryPersistence.Base | any,
  ): Beneficiary | null {
    if (!p) return null;

    const beneficiary = Beneficiary.create({
      projectId: p.projectId,
      name: p.name,
      type: p.type as BeneficiaryType,
      gender: MapperUtils.nullToUndefined(p.gender) as
        | BeneficiaryGender
        | undefined,
      age: MapperUtils.nullToUndefined(p.age),
      dateOfBirth: MapperUtils.nullToUndefined(p.dateOfBirth),
      contactNumber: MapperUtils.nullToUndefined(p.contactNumber),
      email: MapperUtils.nullToUndefined(p.email),
      address: MapperUtils.nullToUndefined(p.address),
      location: MapperUtils.nullToUndefined(p.location),
      category: MapperUtils.nullToUndefined(p.category),
      enrollmentDate: p.enrollmentDate,
      benefitsReceived: p.benefitsReceived || [],
      notes: MapperUtils.nullToUndefined(p.notes),
      metadata: p.metadata as Record<string, any> | undefined,
    });

    (beneficiary as any)["#id"] = p.id;
    (beneficiary as any)["#exitDate"] = MapperUtils.nullToUndefined(p.exitDate);
    (beneficiary as any)["#status"] = p.status as BeneficiaryStatus;
    (beneficiary as any)["createdAt"] = p.createdAt;
    (beneficiary as any)["updatedAt"] = p.updatedAt;

    return beneficiary;
  }

  static toBeneficiaryCreatePersistence(
    domain: Beneficiary,
  ): Prisma.BeneficiaryUncheckedCreateInput {
    return {
      id: domain.id,
      projectId: domain.projectId,
      name: domain.name,
      type: domain.type,
      gender: MapperUtils.undefinedToNull(domain.gender),
      age: MapperUtils.undefinedToNull(domain.age),
      dateOfBirth: MapperUtils.undefinedToNull(domain.dateOfBirth),
      contactNumber: MapperUtils.undefinedToNull(domain.contactNumber),
      email: MapperUtils.undefinedToNull(domain.email),
      address: MapperUtils.undefinedToNull(domain.address),
      location: MapperUtils.undefinedToNull(domain.location),
      category: MapperUtils.undefinedToNull(domain.category),
      enrollmentDate: domain.enrollmentDate,
      exitDate: MapperUtils.undefinedToNull(domain.exitDate),
      status: domain.status,
      benefitsReceived: domain.benefitsReceived,
      notes: MapperUtils.undefinedToNull(domain.notes),
      metadata: domain.metadata as Prisma.InputJsonValue,
      createdAt: domain.createdAt || new Date(),
      updatedAt: domain.updatedAt || new Date(),
    };
  }

  static toBeneficiaryUpdatePersistence(
    domain: Beneficiary,
  ): Prisma.BeneficiaryUncheckedUpdateInput {
    return {
      name: domain.name,
      type: domain.type,
      gender: MapperUtils.undefinedToNull(domain.gender),
      age: MapperUtils.undefinedToNull(domain.age),
      dateOfBirth: MapperUtils.undefinedToNull(domain.dateOfBirth),
      contactNumber: MapperUtils.undefinedToNull(domain.contactNumber),
      email: MapperUtils.undefinedToNull(domain.email),
      address: MapperUtils.undefinedToNull(domain.address),
      location: MapperUtils.undefinedToNull(domain.location),
      category: MapperUtils.undefinedToNull(domain.category),
      exitDate: MapperUtils.undefinedToNull(domain.exitDate),
      status: domain.status,
      benefitsReceived: domain.benefitsReceived,
      notes: MapperUtils.undefinedToNull(domain.notes),
      metadata: domain.metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    };
  }
}
