import { AggregateRoot } from '../../../../shared/models/aggregate-root';
import { BusinessException } from '../../../../shared/exceptions/business-exception';
import { randomUUID } from 'crypto';
import { ActivityCompletedEvent } from '../events/activity-completed.event';

export enum ActivityScale {
  TASK = 'TASK',
  ACTIVITY = 'ACTIVITY',
  EVENT = 'EVENT',
}

export enum ActivityType {
  TRAINING = 'TRAINING',
  AWARENESS = 'AWARENESS',
  DISTRIBUTION = 'DISTRIBUTION',
  SURVEY = 'SURVEY',
  MEETING = 'MEETING',
  FIELD_VISIT = 'FIELD_VISIT',
  DOCUMENTATION = 'DOCUMENTATION',
  WORKSHOP = 'WORKSHOP',
  SEMINAR = 'SEMINAR',
  FUNDRAISING = 'FUNDRAISING',
  VOLUNTEER_ACTIVITY = 'VOLUNTEER_ACTIVITY',
  CONFERENCE = 'CONFERENCE',
  EXHIBITION = 'EXHIBITION',
  OTHER = 'OTHER',
}

export enum ActivityStatus {
  PLANNED = 'PLANNED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum ActivityPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class ActivityFilterProps {
  readonly projectId?: string;
  readonly scale?: ActivityScale;
  readonly status?: ActivityStatus;
  readonly type?: ActivityType;
  readonly assignedTo?: string;
  readonly organizerId?: string;
  readonly parentActivityId?: string;
}

export class ActivityProps {
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
  assignedTo?: string;
  organizerId?: string;
  parentActivityId?: string;
  expectedParticipants?: number;
  estimatedCost?: number;
  currency?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class Activity extends AggregateRoot<string> {
  #projectId: string;
  #name: string;
  #description?: string;
  #scale: ActivityScale;
  #type: ActivityType;
  #status: ActivityStatus;
  #priority: ActivityPriority;
  #startDate?: Date;
  #endDate?: Date;
  #actualStartDate?: Date;
  #actualEndDate?: Date;
  #location?: string;
  #venue?: string;
  #assignedTo?: string;
  #organizerId?: string;
  #parentActivityId?: string;
  #expectedParticipants?: number;
  #actualParticipants?: number;
  #estimatedCost?: number;
  #actualCost?: number;
  #currency?: string;
  #tags: string[];
  #metadata?: Record<string, any>;

  constructor(
    id: string,
    projectId: string,
    name: string,
    scale: ActivityScale,
    type: ActivityType,
    status: ActivityStatus,
    priority: ActivityPriority,
    description?: string,
    startDate?: Date,
    endDate?: Date,
    actualStartDate?: Date,
    actualEndDate?: Date,
    location?: string,
    venue?: string,
    assignedTo?: string,
    organizerId?: string,
    parentActivityId?: string,
    expectedParticipants?: number,
    actualParticipants?: number,
    estimatedCost?: number,
    actualCost?: number,
    currency?: string,
    tags?: string[],
    metadata?: Record<string, any>,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#projectId = projectId;
    this.#name = name;
    this.#scale = scale;
    this.#type = type;
    this.#priority = priority;
    this.#status = status;
    this.#description = description;
    this.#startDate = startDate;
    this.#endDate = endDate;
    this.#actualStartDate = actualStartDate;
    this.#actualEndDate = actualEndDate;
    this.#location = location;
    this.#venue = venue;
    this.#assignedTo = assignedTo;
    this.#organizerId = organizerId;
    this.#parentActivityId = parentActivityId;
    this.#expectedParticipants = expectedParticipants;
    this.#actualParticipants = actualParticipants;
    this.#estimatedCost = estimatedCost;
    this.#actualCost = actualCost;
    this.#currency = currency;
    this.#tags = tags || [];
    this.#metadata = metadata;
  }

  public static create(props: ActivityProps): Activity {
    if (!props.projectId || !props.name) {
      throw new BusinessException('Project ID and name are required');
    }
    if (props.endDate && props.startDate && props.endDate.getTime() < props.startDate.getTime()) {
      throw new BusinessException('End date must be after start date');
    }

    if (props.scale === ActivityScale.EVENT && !props.organizerId) {
      throw new BusinessException('Organizer ID is required for events');
    }

    if (props.estimatedCost !== undefined && props.estimatedCost <= 0) {
      throw new BusinessException('Estimated cost must be positive');
    }

    if (props.parentActivityId) {
      // Note: Circular dependency check should be done at repository/service level
    }

    const activity = new Activity(
      randomUUID(),
      props.projectId,
      props.name,
      props.scale,
      props.type,
      ActivityStatus.PLANNED,
      props.priority,
      props.description,
      props.startDate,
      props.endDate,
      undefined,
      undefined,
      props.location,
      props.venue,
      props.assignedTo,
      props.organizerId,
      props.parentActivityId,
      props.expectedParticipants,
      undefined,
      props.estimatedCost,
      undefined,
      props.currency,
      props.tags,
      undefined,
      undefined,
      undefined
    );



    return activity;
  }

  public update(props: Partial<ActivityProps>): void {
    if (this.#status === ActivityStatus.COMPLETED && props.name) {
      throw new BusinessException('Cannot update completed activity');
    }

    if (props.name) this.#name = props.name;
    if (props.description !== undefined) this.#description = props.description;
    if (props.type) this.#type = props.type;
    if (props.priority) this.#priority = props.priority;
    if (props.location !== undefined) this.#location = props.location;
    if (props.venue !== undefined) this.#venue = props.venue;
    if (props.assignedTo !== undefined) this.#assignedTo = props.assignedTo;
    if (props.organizerId !== undefined) this.#organizerId = props.organizerId;
    if (props.expectedParticipants !== undefined) this.#expectedParticipants = props.expectedParticipants;
    if (props.tags) this.#tags = props.tags;
    if (props.metadata) this.#metadata = props.metadata;

    if (props.startDate) {
      if (props.endDate && props.endDate <= props.startDate) {
        throw new BusinessException('End date must be after start date');
      }
      this.#startDate = props.startDate;
    }

    if (props.endDate) {
      if (this.#startDate && props.endDate <= this.#startDate) {
        throw new BusinessException('End date must be after start date');
      }
      this.#endDate = props.endDate;
    }

    if (props.estimatedCost !== undefined) {
      if (props.estimatedCost <= 0) {
        throw new BusinessException('Estimated cost must be positive');
      }
      this.#estimatedCost = props.estimatedCost;
    }

    // if (props.actualCost !== undefined) {
    //   if (props.actualCost <= 0) {
    //     throw new BusinessException('Actual cost must be positive');
    //   }
    //   this.#actualCost = props.actualCost;
    // }
  }

  public updateStatus(newStatus: ActivityStatus): void {
    if (this.#status === ActivityStatus.COMPLETED || this.#status === ActivityStatus.CANCELLED) {
      throw new BusinessException('Cannot change status of completed or cancelled activity');
    }

    this.#status = newStatus;

    if (newStatus === ActivityStatus.IN_PROGRESS) {
      this.#actualStartDate = new Date();
    }

    if (newStatus === ActivityStatus.COMPLETED) {
      this.#actualEndDate = new Date();
      this.addDomainEvent(new ActivityCompletedEvent(this));
    }
  }



  public updateActualParticipants(count: number): void {
    if (count < 0) {
      throw new BusinessException('Participant count cannot be negative');
    }
    this.#actualParticipants = count;
  }

  // Getters
  get projectId(): string { return this.#projectId; }
  get name(): string { return this.#name; }
  get description(): string | undefined { return this.#description; }
  get scale(): ActivityScale { return this.#scale; }
  get type(): ActivityType { return this.#type; }
  get status(): ActivityStatus { return this.#status; }
  get priority(): ActivityPriority { return this.#priority; }
  get startDate(): Date | undefined { return this.#startDate; }
  get endDate(): Date | undefined { return this.#endDate; }
  get actualStartDate(): Date | undefined { return this.#actualStartDate; }
  get actualEndDate(): Date | undefined { return this.#actualEndDate; }
  get location(): string | undefined { return this.#location; }
  get venue(): string | undefined { return this.#venue; }
  get assignedTo(): string | undefined { return this.#assignedTo; }
  get organizerId(): string | undefined { return this.#organizerId; }
  get parentActivityId(): string | undefined { return this.#parentActivityId; }
  get expectedParticipants(): number | undefined { return this.#expectedParticipants; }
  get actualParticipants(): number | undefined { return this.#actualParticipants; }
  get estimatedCost(): number | undefined { return this.#estimatedCost; }
  get actualCost(): number | undefined { return this.#actualCost; }
  get currency(): string | undefined { return this.#currency; }
  get tags(): string[] { return [...this.#tags]; }
  get metadata(): Record<string, any> | undefined { return this.#metadata ? { ...this.#metadata } : undefined; }

  public isCompleted(): boolean {
    return this.#status === ActivityStatus.COMPLETED;
  }

  public isCancelled(): boolean {
    return this.#status === ActivityStatus.CANCELLED;
  }

  public isEvent(): boolean {
    return this.#scale === ActivityScale.EVENT;
  }

  public isTask(): boolean {
    return this.#scale === ActivityScale.TASK;
  }

  get nextStatus(): ActivityStatus[] {
    switch (this.#status) {
      case ActivityStatus.PLANNED:
        return [ActivityStatus.IN_PROGRESS, ActivityStatus.ON_HOLD, ActivityStatus.CANCELLED];
      case ActivityStatus.IN_PROGRESS:
        return [ActivityStatus.COMPLETED, ActivityStatus.ON_HOLD, ActivityStatus.CANCELLED];
      case ActivityStatus.ON_HOLD:
        return [ActivityStatus.IN_PROGRESS, ActivityStatus.CANCELLED];
      case ActivityStatus.COMPLETED:
      case ActivityStatus.CANCELLED:
        return [];
      case ActivityStatus.CONFIRMED:
        return [ActivityStatus.IN_PROGRESS, ActivityStatus.ON_HOLD, ActivityStatus.CANCELLED];
      default:
        return [];
    }
  }
}

