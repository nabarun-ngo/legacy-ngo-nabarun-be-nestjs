import { randomUUID } from "crypto";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { AggregateRoot } from "../../../../shared/models/aggregate-root";

export enum BeneficiaryType {
  INDIVIDUAL = "INDIVIDUAL",
  FAMILY = "FAMILY",
  COMMUNITY = "COMMUNITY",
  INSTITUTION = "INSTITUTION",
  OTHER = "OTHER",
}

export enum BeneficiaryGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
  PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY",
}

export enum BeneficiaryStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  DROPPED_OUT = "DROPPED_OUT",
  TRANSFERRED = "TRANSFERRED",
}

export class BeneficiaryFilterProps {
  readonly projectId?: string;
  readonly status?: BeneficiaryStatus;
  readonly type?: BeneficiaryType;
  readonly category?: string;
}

export class BeneficiaryProps {
  projectId: string;
  name: string;
  type: BeneficiaryType;
  gender?: BeneficiaryGender;
  age?: number;
  dateOfBirth?: Date;
  contactNumber?: string;
  email?: string;
  address?: string;
  location?: string;
  category?: string;
  enrollmentDate: Date;
  benefitsReceived?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export class Beneficiary extends AggregateRoot<string> {
  #projectId!: string;
  #name!: string;
  #type!: BeneficiaryType;
  #gender?: BeneficiaryGender;
  #age?: number;
  #dateOfBirth?: Date;
  #contactNumber?: string;
  #email?: string;
  #address?: string;
  #location?: string;
  #category?: string;
  #enrollmentDate!: Date;
  #exitDate?: Date;
  #status!: BeneficiaryStatus;
  #benefitsReceived!: string[];
  #notes?: string;
  #metadata?: Record<string, any>;

  private constructor(
    id: string,
    projectId: string,
    name: string,
    type: BeneficiaryType,
    enrollmentDate: Date,
  ) {
    super(id);
    this.#projectId = projectId;
    this.#name = name;
    this.#type = type;
    this.#enrollmentDate = enrollmentDate;
    this.#status = BeneficiaryStatus.ACTIVE;
    this.#benefitsReceived = [];
  }

  public static create(props: BeneficiaryProps): Beneficiary {
    if (!props.projectId || !props.name || !props.type) {
      throw new BusinessException("Project ID, name, and type are required");
    }

    if (props.age !== undefined && props.age < 0) {
      throw new BusinessException("Age cannot be negative");
    }

    // Validate age consistency with dateOfBirth
    if (props.age !== undefined && props.dateOfBirth) {
      const calculatedAge =
        new Date().getFullYear() - props.dateOfBirth.getFullYear();
      if (Math.abs(calculatedAge - props.age) > 1) {
        // Allow 1 year difference for calculation purposes
        throw new BusinessException(
          "Age should be consistent with date of birth",
        );
      }
    }

    const beneficiary = new Beneficiary(
      randomUUID(),
      props.projectId,
      props.name,
      props.type,
      props.enrollmentDate,
    );

    beneficiary.#gender = props.gender;
    beneficiary.#age = props.age;
    beneficiary.#dateOfBirth = props.dateOfBirth;
    beneficiary.#contactNumber = props.contactNumber;
    beneficiary.#email = props.email;
    beneficiary.#address = props.address;
    beneficiary.#location = props.location;
    beneficiary.#category = props.category;
    beneficiary.#benefitsReceived = props.benefitsReceived || [];
    beneficiary.#notes = props.notes;
    beneficiary.#metadata = props.metadata;

    return beneficiary;
  }

  public update(props: Partial<BeneficiaryProps>): void {
    if (props.name) this.#name = props.name;
    if (props.gender !== undefined) this.#gender = props.gender;
    if (props.age !== undefined) {
      if (props.age < 0) {
        throw new BusinessException("Age cannot be negative");
      }
      this.#age = props.age;
    }
    if (props.dateOfBirth !== undefined) this.#dateOfBirth = props.dateOfBirth;
    if (props.contactNumber !== undefined)
      this.#contactNumber = props.contactNumber;
    if (props.email !== undefined) this.#email = props.email;
    if (props.address !== undefined) this.#address = props.address;
    if (props.location !== undefined) this.#location = props.location;
    if (props.category !== undefined) this.#category = props.category;
    if (props.benefitsReceived) this.#benefitsReceived = props.benefitsReceived;
    if (props.notes !== undefined) this.#notes = props.notes;
    if (props.metadata) this.#metadata = props.metadata;
  }

  public markAsExited(exitDate?: Date): void {
    if (exitDate && exitDate <= this.#enrollmentDate) {
      throw new BusinessException("Exit date must be after enrollment date");
    }
    this.#exitDate = exitDate || new Date();
    this.#status = BeneficiaryStatus.COMPLETED;
  }

  public updateStatus(newStatus: BeneficiaryStatus): void {
    this.#status = newStatus;
    if (newStatus === BeneficiaryStatus.COMPLETED && !this.#exitDate) {
      this.#exitDate = new Date();
    }
  }

  public addBenefit(benefit: string): void {
    if (!this.#benefitsReceived.includes(benefit)) {
      this.#benefitsReceived.push(benefit);
    }
  }

  // Getters
  get projectId(): string {
    return this.#projectId;
  }
  get name(): string {
    return this.#name;
  }
  get type(): BeneficiaryType {
    return this.#type;
  }
  get gender(): BeneficiaryGender | undefined {
    return this.#gender;
  }
  get age(): number | undefined {
    return this.#age;
  }
  get dateOfBirth(): Date | undefined {
    return this.#dateOfBirth;
  }
  get contactNumber(): string | undefined {
    return this.#contactNumber;
  }
  get email(): string | undefined {
    return this.#email;
  }
  get address(): string | undefined {
    return this.#address;
  }
  get location(): string | undefined {
    return this.#location;
  }
  get category(): string | undefined {
    return this.#category;
  }
  get enrollmentDate(): Date {
    return this.#enrollmentDate;
  }
  get exitDate(): Date | undefined {
    return this.#exitDate;
  }
  get status(): BeneficiaryStatus {
    return this.#status;
  }
  get benefitsReceived(): string[] {
    return [...this.#benefitsReceived];
  }
  get notes(): string | undefined {
    return this.#notes;
  }
  get metadata(): Record<string, any> | undefined {
    return this.#metadata ? { ...this.#metadata } : undefined;
  }

  public isActive(): boolean {
    return this.#status === BeneficiaryStatus.ACTIVE;
  }

  public isCompleted(): boolean {
    return this.#status === BeneficiaryStatus.COMPLETED;
  }
}
