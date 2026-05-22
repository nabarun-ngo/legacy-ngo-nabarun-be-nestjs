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
  constructor(
    id: string,
    public readonly category: EarningCategory,
    public amount: number,
    public currency: string,
    public status: EarningStatus,
    public description: string,
    public source: string,                       // Source of earning
    public referenceId: string | undefined,      // Project ID, Event ID, etc.
    public referenceType: string | undefined,    // 'Project', 'Event', etc.
    public accountId: string | undefined,        // Account to which credited
    public transactionId: string | undefined,    // Transaction ID after receipt
    public earningDate: Date,
    public receivedDate: Date | undefined,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
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
      props.earningDate || new Date(),
      undefined,
      new Date(),
      new Date(),
    );
  }

  /**
   * Mark earning as received
   */
  markAsReceived(accountId: string, transactionId: string): void {
    if (this.status !== EarningStatus.PENDING) {
      throw new BusinessException('Can only mark pending earnings as received');
    }

    this.status = EarningStatus.RECEIVED;
    this.accountId = accountId;
    this.transactionId = transactionId;
    this.receivedDate = new Date();
  }

  /**
   * Cancel earning
   */
  cancel(): void {
    if (this.status === EarningStatus.RECEIVED) {
      throw new BusinessException('Cannot cancel received earning');
    }

    this.status = EarningStatus.CANCELLED;
  }
}
