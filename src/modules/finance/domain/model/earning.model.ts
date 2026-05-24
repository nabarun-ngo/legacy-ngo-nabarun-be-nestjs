import { User } from 'src/modules/user/domain/model/user.model';
import { BusinessException } from 'src/shared/exceptions/business-exception';
import { AggregateRoot } from 'src/shared/models/aggregate-root';
import { generateUniqueNDigitNumber } from 'src/shared/utilities/password-util';

export enum EarningCategory {
  INTEREST = 'INTEREST',      // Interest from investments
  SERVICE = 'SERVICE',        // Service-based earnings
  PRODUCT = 'PRODUCT',        // Product sales
  GRANT = 'GRANT',            // Grants received
  SPONSORSHIP = 'SPONSORSHIP', // Sponsorships
  OTHER = 'OTHER',            // Other earnings
}

export enum EarningStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class EarningFilter {
  status?: EarningStatus[];
  category?: EarningCategory[];
  source?: string;
  referenceId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Earning Domain Model (Aggregate Root)
 * Represents earnings/income other than donations
 */
export class Earning extends AggregateRoot<string> {
  #category: EarningCategory;
  #amount: number;
  #currency: string;
  #status: EarningStatus;
  #description: string;
  #source: string;                       // Source of earning
  #referenceId: string | undefined;      // Project ID, Event ID, etc.
  #referenceType: string | undefined;    // 'Project', 'Event', etc.
  #accountId: string | undefined;        // Account to which credited
  #transactionId: string | undefined;    // Transaction ID after receipt
  #earningDate: Date | undefined;
  #createdBy: Partial<User>;
  #receivedBy: Partial<User> | undefined;
  constructor(
    id: string,
    category: EarningCategory,
    amount: number,
    currency: string,
    status: EarningStatus,
    description: string,
    source: string,                       // Source of earning
    referenceId: string | undefined,      // Project ID, Event ID, etc.
    referenceType: string | undefined,    // 'Project', 'Event', etc.
    accountId: string | undefined,        // Account to which credited
    transactionId: string | undefined,    // Transaction ID after receipt
    earningDate: Date | undefined,
    createdBy: Partial<User>,
    receivedBy: Partial<User> | undefined,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#category = category;
    this.#amount = amount;
    this.#currency = currency;
    this.#status = status;
    this.#description = description;
    this.#source = source;
    this.#referenceId = referenceId;
    this.#referenceType = referenceType;
    this.#accountId = accountId;
    this.#transactionId = transactionId;
    this.#earningDate = earningDate;
    this.#createdBy = createdBy;
    this.#receivedBy = receivedBy;
  }



  /**
   * Factory method to create a new Earning
   */
  static create(props: {
    category: EarningCategory;
    amount: number;
    currency: string;
    description: string;
    source?: string;
    referenceId?: string;
    referenceType?: string;
    earningDate?: Date;
    createdById: string;
  }): Earning {
    return new Earning(
      `NER${generateUniqueNDigitNumber(6)}`,
      props.category,
      props.amount,
      props.currency,
      EarningStatus.PENDING,
      props.description,
      props.source || '',
      props.referenceId,
      props.referenceType,
      undefined,
      undefined,
      props.earningDate,
      { id: props.createdById },
      undefined,
      new Date(),
      new Date(),
    );
  }

  /**
   * Mark earning as received
   */
  markAsReceived(accountId: string, earningDate: Date, receivedById: string): void {
    if (this.status !== EarningStatus.PENDING) {
      throw new BusinessException('Can only mark pending earnings as received');
    }
    this.#status = EarningStatus.RECEIVED;
    this.#accountId = accountId;
    this.#earningDate = earningDate;
    this.#receivedBy = { id: receivedById };
  }

  setTransactionId(id: string) {
    this.#transactionId = id;
  }

  /**
   * Cancel earning
   */
  cancel(): void {
    if (this.status === EarningStatus.RECEIVED) {
      throw new BusinessException('Cannot cancel received earning');
    }

    this.#status = EarningStatus.CANCELLED;
  }

  update(dto: {
    category?: EarningCategory;
    amount?: number;
    currency?: string;
    description?: string;
    source?: string;
    earningDate?: Date;
  }): void {
    if (dto.amount && this.status !== EarningStatus.PENDING) {
      throw new BusinessException('Can not update amount of received earning');
    }
    if (dto.category && this.status !== EarningStatus.PENDING) {
      throw new BusinessException('Can not update category of received earning');
    }
    this.#category = dto.category ?? this.#category;
    this.#amount = dto.amount ?? this.#amount;
    this.#currency = dto.currency ?? this.#currency;
    this.#description = dto.description ?? this.#description;
    this.#source = dto.source ?? this.#source;
    this.#earningDate = dto.earningDate ?? this.#earningDate;
  }


  get category(): EarningCategory {
    return this.#category;
  }

  get amount(): number {
    return this.#amount;
  }

  get currency(): string {
    return this.#currency;
  }

  get status(): EarningStatus {
    return this.#status;
  }

  get description(): string {
    return this.#description;
  }

  get source(): string {
    return this.#source;
  }

  get referenceId(): string | undefined {
    return this.#referenceId;
  }

  get referenceType(): string | undefined {
    return this.#referenceType;
  }

  get accountId(): string | undefined {
    return this.#accountId;
  }

  get transactionId(): string | undefined {
    return this.#transactionId;
  }

  get earningDate(): Date | undefined {
    return this.#earningDate;
  }
  get createdBy(): Partial<User> {
    return this.#createdBy;
  }

  get receivedBy(): Partial<User> | undefined {
    return this.#receivedBy;
  }
}
