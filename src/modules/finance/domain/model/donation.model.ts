import { AggregateRoot } from 'src/shared/models/aggregate-root';
import { DonationRaisedEvent } from '../events/donation-raised.event';
import { DonationPaidEvent } from '../events/donation-paid.event';
import { BusinessException } from 'src/shared/exceptions/business-exception';
import { User } from 'src/modules/user/domain/model/user.model';
import { Account } from './account.model';
import { ValidationUtil } from 'src/shared/utilities/validation.util';
import { generateUniqueNDigitNumber } from 'src/shared/utilities/password-util';

export enum DonationType {
  REGULAR = 'REGULAR',        // Monthly subscription for internal users
  ONETIME = 'ONETIME',        // One-time donation from guests or members
}

export enum DonationStatus {
  RAISED = 'RAISED',          // Raised but not yet paid
  PAID = 'PAID',              // Payment completed
  PENDING = 'PENDING',        // Pending payment
  PAYMENT_FAILED = 'PAYMENT_FAILED', // Payment failed
  PAY_LATER = 'PAY_LATER',    // Payment deferred to later
  CANCELLED = 'CANCELLED',    // Cancelled before payment
  UPDATE_MISTAKE = 'UPDATE_MISTAKE', // Update mistake status
}

export enum PaymentMethod {
  CASH = 'CASH',
  NETBANKING = 'NETBANKING',
  UPI = 'UPI',
}

export enum UPIPaymentType {
  GPAY = 'GPAY',
  PAYTM = 'PAYTM',
  PHONEPE = 'PHONEPE',
  BHARATPAY = 'BHARATPAY',
  UPI_OTH = 'UPI_OTH',
}

export class DonationFilter {
  donationId?: string;
  donorId?: string;
  donorName?: string;
  status?: DonationStatus[];
  type?: DonationType[];
  isGuest?: boolean;
  startDate_raisedOn?: Date;
  endDate_raisedOn?: Date;
  startDate_paidOn?: Date;
  endDate_paidOn?: Date;
  startDate_confirmedOn?: Date;
  endDate_confirmedOn?: Date;
  startDate_lte?: Date;
  endDate_gte?: Date;
  forEventId?: string;
}

/**
 * Donation Domain Model (Aggregate Root)
 * Represents a financial donation - either regular (monthly) or one-time
 * All business logic and validations are in this domain model
 */
export class Donation extends AggregateRoot<string> {
  // Private fields for encapsulation
  #type: DonationType;
  #amount: number;
  #currency: string;
  #status: DonationStatus;
  #donorId: string | undefined;
  #donorName: string;
  #donorEmail: string | undefined;

  // Legacy fields
  #isGuest: boolean;
  #startDate: Date | undefined;
  #endDate: Date | undefined;
  #raisedOn: Date; // Legacy alias
  #paidOn: Date | undefined; // Legacy alias
  #confirmedBy: Partial<User> | undefined;
  #confirmedOn: Date | undefined;
  #paymentMethod: PaymentMethod | undefined;
  #paidToAccount: Partial<Account> | undefined;
  #forEventId: string | undefined;
  #activityName: string | undefined;
  #paidUsingUPI: UPIPaymentType | undefined;
  #isPaymentNotified: boolean;
  #transactionRef: string | undefined; // Legacy alias
  #remarks: string | undefined;
  #cancelletionReason: string | undefined; // Legacy typo preserved
  #laterPaymentReason: string | undefined;
  #paymentFailureDetail: string | undefined;
  #donorNumber: string | undefined;
  static outstandingStatus: DonationStatus[] = [
    DonationStatus.RAISED,
    DonationStatus.PENDING,
    DonationStatus.PAYMENT_FAILED,
    DonationStatus.PAY_LATER,
    DonationStatus.UPDATE_MISTAKE,
  ];

  constructor(
    id: string,
    type: DonationType,
    amount: number,
    currency: string,
    status: DonationStatus,
    donorId: string | undefined,
    donorName: string,
    donorEmail: string | undefined,
    donorNumber: string | undefined,
    raisedOn: Date,
    paidDate: Date | undefined,
    transactionId: string | undefined,
    isGuest: boolean = false,
    startDate?: Date,
    endDate?: Date,
    confirmedBy?: User,
    confirmedOn?: Date,
    paymentMethod?: PaymentMethod,
    paidToAccountId?: Account,
    forEventId?: string,
    activityName?: string,
    paidUsingUPI?: UPIPaymentType,
    isPaymentNotified: boolean = false,
    remarks?: string,
    cancelletionReason?: string,
    laterPaymentReason?: string,
    paymentFailureDetail?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);

    this.#type = type;
    this.#amount = amount;
    this.#currency = currency;
    this.#status = status;
    this.#donorId = donorId;
    this.#donorName = donorName;
    this.#donorEmail = donorEmail;
    this.#donorNumber = donorNumber;
    this.#isGuest = isGuest;
    this.#startDate = startDate;
    this.#endDate = endDate;
    this.#raisedOn = raisedOn; // Legacy alias
    this.#paidOn = paidDate; // Legacy alias
    this.#confirmedBy = confirmedBy;
    this.#confirmedOn = confirmedOn;
    this.#paymentMethod = paymentMethod;
    this.#paidToAccount = paidToAccountId;
    this.#forEventId = forEventId;
    this.#paidUsingUPI = paidUsingUPI;
    this.#isPaymentNotified = isPaymentNotified;
    this.#transactionRef = transactionId; // Legacy alias
    this.#remarks = remarks;
    this.#cancelletionReason = cancelletionReason;
    this.#laterPaymentReason = laterPaymentReason;
    this.#paymentFailureDetail = paymentFailureDetail;
    this.#activityName = activityName;
  }

  /**
   * Factory method to create a new Regular Donation (for internal users)
   * Business validation: amount must be positive, donorId required
   */
  static create(props: {
    type: DonationType;
    amount: number;
    donorName: string;
    donorId?: string;
    donorEmail?: string;
    donorNumber?: string;
    startDate?: Date;
    endDate?: Date;
    currency?: string;
    isGuest?: boolean
  }): Donation {
    if (!props.amount || props.amount <= 0) {
      throw new BusinessException('Donation amount must be greater than zero');
    }

    const isRegular = props.type === DonationType.REGULAR;
    ValidationUtil.validateRequiredIf(props.donorId, isRegular, 'Donor ID');
    ValidationUtil.validateRequiredIf(props.startDate, isRegular, 'Start Date');
    ValidationUtil.validateRequiredIf(props.endDate, isRegular, 'End Date');

    const isGuestOneTime = props.type === DonationType.ONETIME && props.isGuest == true;
    ValidationUtil.validateRequiredIf(props.donorName, isGuestOneTime, 'Donor Name');

    props.currency = props.currency;
    const raisedDate = new Date();
    const donation = new Donation(
      `NDON${generateUniqueNDigitNumber(6)}`,
      props.type,
      props.amount,
      props.currency || 'INR',
      DonationStatus.RAISED,
      props.donorId,
      props.donorName,
      props.donorEmail,
      props.donorNumber,
      raisedDate,
      undefined,
      undefined,
      props.isGuest, // isGuest
      props.startDate,
      props.endDate,
      undefined, // confirmedBy
      undefined, // confirmedOn
      undefined, // paymentMethod
      undefined, // paidToAccountId
      undefined, // forEventId
      undefined, // activityName
      undefined, // paidUsingUPI
      false, // isPaymentNotified
      undefined, // remarks
      undefined, // cancelletionReason
      undefined, // laterPaymentReason
      undefined, // paymentFailureDetail
    );

    donation.addDomainEvent(new DonationRaisedEvent(
      donation,
    ));

    return donation;
  }

  /**
   * Mark donation as paid and link to transaction
   * Business validation: Cannot pay if already paid or cancelled
   */
  markAsPaid(props: {
    paidToAccountId: string;
    paymentMethod: PaymentMethod;
    paidUsingUPI?: UPIPaymentType;
    confirmedById?: string;
    paidDate?: Date;
  }): void {
    ValidationUtil.validateRequired(props.confirmedById, 'confirmedById');
    ValidationUtil.validateRequired(props.paidToAccountId, 'paidToAccountId');
    ValidationUtil.validateRequired(props.paymentMethod, 'paymentMethod');
    ValidationUtil.validateRequired(props.paidDate, 'paidOn');


    if (this.#status === DonationStatus.PAID) {
      throw new BusinessException('Donation is already paid');
    }

    if (this.#status === DonationStatus.CANCELLED) {
      throw new BusinessException('Cannot pay a cancelled donation');
    }

    if (this.#status === DonationStatus.UPDATE_MISTAKE) {
      throw new BusinessException('Cannot pay a donation marked for update');
    }

    this.#status = DonationStatus.PAID;
    this.#paidOn = props.paidDate;
    this.#confirmedOn = new Date();

    if (props.paidToAccountId) {
      this.#paidToAccount = {
        id: props.paidToAccountId,
      };
    }
    if (props.paymentMethod) {
      this.#paymentMethod = props.paymentMethod;
    }
    if (props.paidUsingUPI) {
      this.#paidUsingUPI = props.paidUsingUPI;
    }
    if (props.confirmedById) {
      this.#confirmedBy = {
        id: props.confirmedById,
      };
      this.#confirmedOn = new Date();
    }

    this.touch();

    this.addDomainEvent(new DonationPaidEvent(
      this,
    ));
  }

  /**
   * Cancel donation before payment
   * Business validation: Cannot cancel if already paid
   */
  cancel(reason?: string): void {
    if (this.#status === DonationStatus.PAID) {
      throw new BusinessException('Cannot cancel a paid donation');
    }

    if (this.#status === DonationStatus.CANCELLED) {
      throw new BusinessException('Donation is already cancelled');
    }

    this.#status = DonationStatus.CANCELLED;
    if (reason) {
      this.#cancelletionReason = reason;
    }
    this.touch();
  }

  /**
   * Mark payment as failed
   * Business validation: Cannot mark paid donation as failed
   */
  markAsFailed(failureDetail?: string): void {
    if (this.#status === DonationStatus.PAID) {
      throw new BusinessException('Cannot mark paid donation as failed');
    }

    this.#status = DonationStatus.PAYMENT_FAILED;
    if (failureDetail) {
      this.#paymentFailureDetail = failureDetail;
    }
    this.touch();
  }

  /**
   * Mark as pending payment
   */
  markAsPending(): void {
    if (this.#status !== DonationStatus.RAISED && this.#status !== DonationStatus.UPDATE_MISTAKE) {
      throw new BusinessException(`Cannot mark donation as pending from current status: ${this.#status}`);
    }
    this.#status = DonationStatus.PENDING;
    this.touch();
  }

  /**
   * Mark as pay later with reason
   */
  markAsPayLater(reason: string): void {
    if (this.#status === DonationStatus.PAID) {
      throw new BusinessException('Cannot mark paid donation as pay later');
    }
    this.#status = DonationStatus.PAY_LATER;
    this.#laterPaymentReason = reason;
    this.touch();
  }

  /**
   * Mark for update mistake
   */
  markForUpdateMistake(): void {
    if (this.#status !== DonationStatus.PAID) {
      throw new BusinessException('The donation must be paid to mark for update mistake');
    }
    this.#status = DonationStatus.UPDATE_MISTAKE;
    this.touch();
  }

  resetPaymentDetails(): void {
    this.#transactionRef = undefined;
    this.#paidOn = undefined;
    this.#paidToAccount = undefined;
    this.#paymentMethod = undefined;
    this.#paidUsingUPI = undefined;
    this.#confirmedBy = undefined;
    this.#confirmedOn = undefined;
    this.touch();
  }
  /**
   * Update donation details
   * Business validation: Cannot update paid donations (except through specific flows)
   */
  update(props: {
    amount?: number;
    remarks?: string;
    forEventId?: string;
  }): void {
    if (this.#status === DonationStatus.PAID && props.amount) {
      throw new BusinessException('Cannot change amount of paid donation');
    }

    if (props.amount && props.amount <= 0) {
      throw new BusinessException('Donation amount must be greater than zero');
    }

    this.#amount = props.amount ?? this.#amount;
    this.#remarks = props.remarks ?? this.#remarks;
    this.#forEventId = props.forEventId ?? this.#forEventId;
    this.touch();
  }

  linkTransaction(transactionId: string | undefined): void {
    this.#transactionRef = transactionId ?? this.#transactionRef;
    this.touch();
  }

  /**
   * Confirm donation
   */
  confirm(confirmedBy: User): void {
    this.#confirmedBy = confirmedBy;
    this.#confirmedOn = new Date();
    this.touch();
  }

  /**
   * Mark payment notification as sent
   */
  markPaymentNotified(): void {
    this.#isPaymentNotified = true;
    this.touch();
  }



  // Getters
  get type(): DonationType { return this.#type; }
  get amount(): number { return this.#amount; }
  get currency(): string { return this.#currency; }
  get status(): DonationStatus { return this.#status; }
  get donorId(): string | undefined { return this.#donorId; }
  get donorName(): string { return this.#donorName; }
  get donorEmail(): string | undefined { return this.#donorEmail; }
  get donorNumber(): string | undefined { return this.#donorNumber; }
  get isGuest(): boolean { return this.#isGuest; }
  get startDate(): Date | undefined { return this.#startDate; }
  get endDate(): Date | undefined { return this.#endDate; }
  get raisedOn(): Date { return this.#raisedOn; }
  get paidOn(): Date | undefined { return this.#paidOn; }
  get confirmedBy(): Partial<User> | undefined { return this.#confirmedBy; }
  get confirmedOn(): Date | undefined { return this.#confirmedOn; }
  get paymentMethod(): PaymentMethod | undefined { return this.#paymentMethod; }
  get paidToAccount(): Partial<Account> | undefined { return this.#paidToAccount; }
  get forEventId(): string | undefined { return this.#forEventId; }
  get activityName(): string | undefined { return this.#activityName; }
  get paidUsingUPI(): UPIPaymentType | undefined { return this.#paidUsingUPI; }
  get isPaymentNotified(): boolean { return this.#isPaymentNotified; }
  get transactionRef(): string | undefined { return this.#transactionRef; }
  get remarks(): string | undefined { return this.#remarks; }
  get cancelletionReason(): string | undefined { return this.#cancelletionReason; }
  get laterPaymentReason(): string | undefined { return this.#laterPaymentReason; }
  get paymentFailureDetail(): string | undefined { return this.#paymentFailureDetail; }


  /**
   * Check if donation is from a guest (not an internal user)
   */
  isGuestDonation(): boolean {
    return this.#isGuest || !this.#donorId;
  }

  /**
   * Check if donation is pending payment
   */
  isPending(): boolean {
    return this.#status === DonationStatus.RAISED || this.#status === DonationStatus.PENDING;
  }

  /**
   * Check if donation can be paid
   */
  canBePaid(): boolean {
    return this.#status === DonationStatus.RAISED ||
      this.#status === DonationStatus.PENDING ||
      this.#status === DonationStatus.PAY_LATER;
  }

  nextStatus(): DonationStatus[] {
    switch (this.#status) {
      case DonationStatus.RAISED:
        return [
          DonationStatus.PENDING,
          DonationStatus.PAID,
          DonationStatus.PAYMENT_FAILED,
          DonationStatus.PAY_LATER,
          DonationStatus.CANCELLED,
        ];
      case DonationStatus.PENDING:
        return [
          DonationStatus.PAID,
          DonationStatus.PAYMENT_FAILED,
          DonationStatus.PAY_LATER,
          DonationStatus.CANCELLED,
        ];
      case DonationStatus.PAID:
        return [
          DonationStatus.UPDATE_MISTAKE,
        ];
      case DonationStatus.PAYMENT_FAILED:
        return [
          DonationStatus.PAID
        ];
      case DonationStatus.PAY_LATER:
        return [
          DonationStatus.PAID,
          DonationStatus.CANCELLED,
          DonationStatus.PAYMENT_FAILED,
        ];
      case DonationStatus.CANCELLED:
        return [];
      case DonationStatus.UPDATE_MISTAKE:
        return [DonationStatus.PENDING];
      default:
        throw new BusinessException('Invalid donation status');
    }
  }


}
