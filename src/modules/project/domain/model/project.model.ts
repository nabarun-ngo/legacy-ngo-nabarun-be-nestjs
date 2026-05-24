import { AggregateRoot } from '../../../../shared/models/aggregate-root';
import { BusinessException } from '../../../../shared/exceptions/business-exception';
import { randomUUID } from 'crypto';

export enum ProjectCategory {
  EDUCATION = 'EDUCATION',
  HEALTH = 'HEALTH',
  ENVIRONMENT = 'ENVIRONMENT',
  RURAL_DEVELOPMENT = 'RURAL_DEVELOPMENT',
  WOMEN_EMPOWERMENT = 'WOMEN_EMPOWERMENT',
  CHILD_WELFARE = 'CHILD_WELFARE',
  DISASTER_RELIEF = 'DISASTER_RELIEF',
  OTHER = 'OTHER',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectPhase {
  INITIATION = 'INITIATION',
  PLANNING = 'PLANNING',
  EXECUTION = 'EXECUTION',
  MONITORING = 'MONITORING',
  CLOSURE = 'CLOSURE',
}

export class ProjectFilterProps {
  readonly status?: ProjectStatus;
  readonly category?: ProjectCategory;
  readonly phase?: ProjectPhase;
  readonly managerId?: string;
  readonly sponsorId?: string;
  readonly location?: string;
  readonly tags?: string[];
}

export class ProjectProps {
  name: string;
  description: string;
  code: string;
  category: ProjectCategory;
  status: ProjectStatus;
  phase: ProjectPhase;
  startDate: Date;
  endDate?: Date;
  budget: number;
  currency: string;
  location?: string;
  targetBeneficiaryCount?: number;
  managerId: string;
  sponsorId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class Project extends AggregateRoot<string> {
  #name: string;
  #description: string;
  #code: string;
  #category: ProjectCategory;
  #status: ProjectStatus;
  #phase: ProjectPhase;
  #managerId: string;
  #startDate: Date;
  #endDate?: Date;
  #actualEndDate?: Date;
  #budget?: number;
  #spentAmount?: number;
  #currency: string;
  #location?: string;
  #targetBeneficiaryCount?: number;
  #actualBeneficiaryCount?: number;
  #sponsorId?: string;
  #tags!: string[];
  #metadata?: Record<string, any>;

  constructor(
    id: string,
    name: string,
    description: string,
    code: string,
    category: ProjectCategory,
    status: ProjectStatus,
    phase: ProjectPhase,
    managerId: string,
    startDate: Date,
    endDate?: Date,
    actualEndDate?: Date,
    budget?: number,
    spentAmount?: number,
    currency?: string,
    location?: string,
    targetBeneficiaryCount?: number,
    actualBeneficiaryCount?: number,
    sponsorId?: string,
    tags?: string[],
    metadata?: Record<string, any>,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#name = name;
    this.#description = description;
    this.#code = code;
    this.#category = category;
    this.#status = status;
    this.#phase = phase;
    this.#startDate = startDate;
    this.#endDate = endDate;
    this.#actualEndDate = actualEndDate;
    this.#budget = budget;
    this.#spentAmount = spentAmount;
    this.#location = location;
    this.#targetBeneficiaryCount = targetBeneficiaryCount;
    this.#actualBeneficiaryCount = actualBeneficiaryCount;
    this.#currency = currency || 'INR';
    this.#managerId = managerId;
    this.#sponsorId = sponsorId;
    this.#tags = tags || [];
    this.#metadata = metadata;
  }

  public static create(props: ProjectProps): Project {
    if (!props.name || !props.description || !props.code) {
      throw new BusinessException('Name, description, and code are required');
    }

    if (props.budget <= 0) {
      throw new BusinessException('Budget must be positive');
    }

    if (props.endDate && props.endDate <= props.startDate) {
      throw new BusinessException('End date must be after start date');
    }

    if (!props.managerId) {
      throw new BusinessException('Manager ID is required');
    }

    const project = new Project(
      randomUUID(),
      props.name,
      props.description,
      props.code,
      props.category,
      props.status || ProjectStatus.PLANNING,
      props.phase || ProjectPhase.INITIATION,
      props.managerId,
      props.startDate,
      props.endDate,
      undefined,
      props.budget,
      undefined,
      props.currency,
      props.location,
      props.targetBeneficiaryCount,
      undefined,
      props.sponsorId,
      props.tags,
      props.metadata,
    );

    project.#endDate = props.endDate;
    project.#location = props.location;
    project.#targetBeneficiaryCount = props.targetBeneficiaryCount;
    project.#sponsorId = props.sponsorId;
    project.#tags = props.tags || [];
    project.#metadata = props.metadata;

    return project;
  }

  public update(props: Partial<ProjectProps>): void {
    if (this.#status === ProjectStatus.COMPLETED && props.budget && props.budget !== this.#budget) {
      throw new BusinessException('Cannot modify budget for completed project');
    }

    this.#name = props.name ?? this.#name;
    this.#description = props.description ?? this.#description;
    this.#category = props.category ?? this.#category;
    this.#location = props.location ?? this.#location;
    this.#targetBeneficiaryCount = props.targetBeneficiaryCount ?? this.#targetBeneficiaryCount;
    this.#sponsorId = props.sponsorId ?? this.#sponsorId;
    this.#tags = props.tags ?? this.#tags;
    this.#metadata = props.metadata ?? this.#metadata;
    this.#startDate = props.startDate ?? this.#startDate;

    if (props.endDate) {
      if (props.endDate <= this.#startDate!) {
        throw new BusinessException('End date must be after start date');
      }
      this.#endDate = props.endDate;
    }

    if (props.budget !== undefined) {
      if (props.budget <= 0) {
        throw new BusinessException('Budget must be positive');
      }
      if (props.budget < this.#spentAmount!) {
        throw new BusinessException('Budget cannot be less than spent amount');
      }
      this.#budget = props.budget;
    }
  }

  public updateStatus(newStatus: ProjectStatus): void {
    if (this.#status === ProjectStatus.COMPLETED && newStatus !== ProjectStatus.COMPLETED) {
      throw new BusinessException('Cannot change status of completed project');
    }

    if (newStatus === ProjectStatus.CANCELLED &&
      this.#status !== ProjectStatus.PLANNING &&
      this.#status !== ProjectStatus.ACTIVE) {
      throw new BusinessException('Can only cancel projects in PLANNING or ACTIVE status');
    }

    this.#status = newStatus;

    if (newStatus === ProjectStatus.COMPLETED && !this.#actualEndDate) {
      this.#actualEndDate = new Date();
    }
  }

  public updatePhase(newPhase: ProjectPhase): void {
    const phaseOrder = [
      ProjectPhase.INITIATION,
      ProjectPhase.PLANNING,
      ProjectPhase.EXECUTION,
      ProjectPhase.MONITORING,
      ProjectPhase.CLOSURE,
    ];

    const currentIndex = phaseOrder.indexOf(this.#phase);
    const newIndex = phaseOrder.indexOf(newPhase);

    if (newIndex <= currentIndex) {
      throw new BusinessException('Cannot move to previous phase');
    }

    if (newIndex - currentIndex > 1) {
      throw new BusinessException('Cannot skip phases');
    }

    this.#phase = newPhase;
  }

  public addSpentAmount(amount: number): void {
    if (amount <= 0) {
      throw new BusinessException('Amount must be positive');
    }
    this.#spentAmount = amount;
  }

  public updateBeneficiaryCount(actualCount: number): void {
    if (actualCount < 0) {
      throw new BusinessException('Beneficiary count cannot be negative');
    }
    this.#actualBeneficiaryCount = actualCount;
  }

  // Getters
  get name(): string { return this.#name; }
  get description(): string { return this.#description; }
  get code(): string { return this.#code; }
  get category(): ProjectCategory { return this.#category; }
  get status(): ProjectStatus { return this.#status; }
  get phase(): ProjectPhase { return this.#phase; }
  get startDate(): Date { return this.#startDate; }
  get endDate(): Date | undefined { return this.#endDate; }
  get actualEndDate(): Date | undefined { return this.#actualEndDate; }
  get budget(): number | undefined { return this.#budget; }
  get spentAmount(): number | undefined { return this.#spentAmount; }
  get currency(): string { return this.#currency; }
  get location(): string | undefined { return this.#location; }
  get targetBeneficiaryCount(): number | undefined { return this.#targetBeneficiaryCount; }
  get actualBeneficiaryCount(): number | undefined { return this.#actualBeneficiaryCount; }
  get managerId(): string { return this.#managerId; }
  get sponsorId(): string | undefined { return this.#sponsorId; }
  get tags(): string[] { return [...this.#tags]; }
  get metadata(): Record<string, any> | undefined { return this.#metadata ? { ...this.#metadata } : undefined; }

  get nextStatus(): ProjectStatus[] {
    switch (this.#status) {
      case ProjectStatus.PLANNING:
        return [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED];
      case ProjectStatus.ACTIVE:
        return [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED];
      case ProjectStatus.ON_HOLD:
        return [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED];
      case ProjectStatus.COMPLETED:
      case ProjectStatus.CANCELLED:
        return [];
    }
  }

  public isActive(): boolean {
    return this.#status === ProjectStatus.ACTIVE;
  }

  public isCompleted(): boolean {
    return this.#status === ProjectStatus.COMPLETED;
  }

  public isCancelled(): boolean {
    return this.#status === ProjectStatus.CANCELLED;
  }

  public getBudgetUtilization(): number {
    return this.#budget! > 0 ? (this.#spentAmount! / this.#budget!) * 100 : 0;
  }
}

