import { Beneficiary } from "../../domain/model/beneficiary.model";
import { Project } from "../../domain/model/project.model";
import { BeneficiaryDetailDto } from "./beneficiary.dto";
import { ProjectDetailDto } from "./project.dto";

/**
 * Project DTO Mapper
 */
export class ProjectDtoMapper {
  static toDto(project: Project): ProjectDetailDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      code: project.code,
      category: project.category,
      status: project.status,
      phase: project.phase,
      startDate: project.startDate,
      endDate: project.endDate,
      actualEndDate: project.actualEndDate,
      budget: project.budget,
      spentAmount: project.spentAmount,
      currency: project.currency,
      location: project.location,
      targetBeneficiaryCount: project.targetBeneficiaryCount,
      actualBeneficiaryCount: project.actualBeneficiaryCount,
      managerId: project.managerId,
      sponsorId: project.sponsorId,
      tags: project.tags,
      metadata: project.metadata,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      nextStatus: project.nextStatus,
    };
  }
}

import { Activity } from "../../domain/model/activity.model";
import { ActivityDetailDto } from "./activity.dto";

/**
 * Activity DTO Mapper
 */
export class ActivityDtoMapper {
  static toDto(activity: Activity): ActivityDetailDto {
    return {
      id: activity.id,
      projectId: activity.projectId,
      name: activity.name,
      description: activity.description,
      scale: activity.scale,
      type: activity.type,
      status: activity.status,
      priority: activity.priority,
      startDate: activity.startDate,
      endDate: activity.endDate,
      actualStartDate: activity.actualStartDate,
      actualEndDate: activity.actualEndDate,
      location: activity.location,
      venue: activity.venue,
      assignedTo: activity.assignedTo,
      organizerId: activity.organizerId,
      parentActivityId: activity.parentActivityId,
      expectedParticipants: activity.expectedParticipants,
      actualParticipants: activity.actualParticipants,
      estimatedCost: activity.estimatedCost,
      actualCost: activity.actualCost,
      currency: activity.currency,
      tags: activity.tags,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      nextStatus: activity.nextStatus,
    };
  }
}

/**
 * Beneficiary DTO Mapper
 */
export class BeneficiaryDtoMapper {
  static toDto(beneficiary: Beneficiary): BeneficiaryDetailDto {
    return {
      id: beneficiary.id,
      projectId: beneficiary.projectId,
      name: beneficiary.name,
      type: beneficiary.type,
      gender: beneficiary.gender,
      age: beneficiary.age,
      dateOfBirth: beneficiary.dateOfBirth,
      contactNumber: beneficiary.contactNumber,
      email: beneficiary.email,
      address: beneficiary.address,
      location: beneficiary.location,
      category: beneficiary.category,
      enrollmentDate: beneficiary.enrollmentDate,
      exitDate: beneficiary.exitDate,
      status: beneficiary.status,
      benefitsReceived: beneficiary.benefitsReceived,
      notes: beneficiary.notes,
      metadata: beneficiary.metadata,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt,
    };
  }
}
