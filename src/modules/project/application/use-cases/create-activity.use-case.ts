import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
Activity,
ActivityPriority,
ActivityScale,
ActivityType,
} from "../../domain/model/activity.model";
import type { IActivityRepository } from "../../domain/repositories/activity.repository.interface";
import { ACTIVITY_REPOSITORY } from "../../domain/repositories/activity.repository.interface";
import type { IProjectRepository } from "../../domain/repositories/project.repository.interface";
import { PROJECT_REPOSITORY } from "../../domain/repositories/project.repository.interface";

export interface CreateActivity {
  projectId: string;
  name: string;
  description?: string;
  scale: ActivityScale;
  type: ActivityType;
  priority: ActivityPriority;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  venue?: string;
  organizerId?: string;
  parentActivityId?: string;
  assignedTo?: string;
  expectedParticipants?: number;
  estimatedCost?: number;
  currency?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class CreateActivityUseCase
  implements IUseCase<CreateActivity, Activity>
{
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activityRepository: IActivityRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: CreateActivity): Promise<Activity> {
    // Verify project exists and is active
    const project = await this.projectRepository.findById(request.projectId);
    if (!project) {
      throw new BusinessException("Project not found");
    }
    if (!project.isActive()) {
      throw new BusinessException("Cannot add activity to inactive project");
    }

    // Verify parent activity if provided
    if (request.parentActivityId) {
      const parentActivity = await this.activityRepository.findById(
        request.parentActivityId,
      );
      if (!parentActivity) {
        throw new BusinessException("Parent activity not found");
      }
      if (parentActivity.projectId !== request.projectId) {
        throw new BusinessException(
          "Parent activity must belong to the same project",
        );
      }
    }

    // Create domain entity
    const activity = Activity.create({
      projectId: request.projectId,
      name: request.name,
      description: request.description,
      scale: request.scale,
      type: request.type,
      priority: request.priority,
      startDate: request.startDate,
      endDate: request.endDate,
      location: request.location,
      venue: request.venue,
      assignedTo: request.assignedTo,
      organizerId: request.organizerId,
      parentActivityId: request.parentActivityId,
      expectedParticipants: request.expectedParticipants,
      estimatedCost: request.estimatedCost,
      currency: request.currency,
      tags: request.tags,
      metadata: request.metadata,
    });

    // Save to repository
    const savedActivity = await this.activityRepository.create(activity);

    // Emit domain events
    for (const event of activity.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    activity.clearEvents();

    return savedActivity;
  }
}
