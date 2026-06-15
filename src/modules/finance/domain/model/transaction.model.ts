import { BusinessException } from "src/shared/exceptions/business-exception";
import { BaseDomain } from "src/shared/models/base-domain";
import { generateUniqueNDigitNumber } from "src/shared/utilities/password-util";

export enum TransactionType {
  IN = "IN", // Legacy: Money coming in
  OUT = "OUT", // Legacy: Money going out
}

export enum TransactionStatus {
  SUCCESS = "SUCCESS", // Legacy: SUCCESS instead of COMPLETED
  REVERSED = "REVERSED", // Legacy: REVERT instead of REVERSED
}

export enum TransactionRefType {
  DONATION = "DONATION",
  NONE = "NONE",
  EXPENSE = "EXPENSE",
  EARNING = "EARNING",
  TXN_REVERSE = "TXN_REVERSE",
}

export class TransactionFilter {
  transactionRef?: string;
  type?: TransactionType[];
  status?: TransactionStatus[];
  referenceType?: TransactionRefType[];
  referenceId?: string;
  accountIds?: string[];
  startDate?: Date;
  endDate?: Date;
  id?: string;
}

/**
 * Transaction Domain Model (Aggregate Root)
 * Represents a financial transaction in the system
 * All business logic and validations are in this domain model
 */
export class Transaction extends BaseDomain<string> {
  // Private fields for encapsulation
  #currency: string;
  #referenceId: string | undefined;
  #referenceType: TransactionRefType | undefined;
  #description: string;
  #metadata: Record<string, any> | undefined;
  #transactionDate: Date;
  #amount: number;
  #type: TransactionType;
  #status: TransactionStatus;
  #particulars: string | undefined;
  #accountId: string | undefined;
  #refAccountId: string | undefined;
  #transactionRef: string;
  #balanceAfter: number | undefined;

  constructor(
    id: string,
    transactionRef: string,
    type: TransactionType,
    amount: number,
    currency: string,
    status: TransactionStatus,
    referenceId: string | undefined,
    referenceType: TransactionRefType | undefined,
    description: string,
    metadata: Record<string, any> | undefined,
    transactionDate: Date,
    txnParticulars?: string,
    accountId?: string,
    refAccountId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    balanceAfter?: number,
  ) {
    super(id, createdAt, updatedAt);
    this.#transactionRef = transactionRef;
    this.#currency = currency;
    this.#referenceId = referenceId;
    this.#referenceType = referenceType;
    this.#description = description;
    this.#metadata = metadata;
    this.#transactionDate = transactionDate;
    this.#amount = amount; // Legacy alias
    this.#type = type; // Legacy alias
    this.#status = status; // Legacy alias
    this.#particulars = txnParticulars;
    this.#accountId = accountId;
    this.#refAccountId = refAccountId;
    this.#balanceAfter = balanceAfter;
  }

  /**
   * Factory method to create a transaction (IN - money coming in)
   * Business validation: amount must be positive, accountId required
   */
  static createIn(props: {
    txnRef: string;
    amount: number;
    currency: string;
    accountId: string;
    description: string;
    referenceId?: string;
    referenceType?: TransactionRefType;
    txnParticulars?: string;
    sourceAccountId?: string;
    transactionDate?: Date;
    metadata?: Record<string, any>;
  }): Transaction {
    if (!props.amount || props.amount <= 0) {
      throw new BusinessException(
        "Transaction amount must be greater than zero",
      );
    }
    if (!props.currency) {
      throw new BusinessException("Currency is required");
    }
    if (!props.accountId) {
      throw new BusinessException("Account ID is required");
    }
    if (!props.description) {
      throw new BusinessException("Transaction description is required");
    }

    const transaction = new Transaction(
      `NTXN${generateUniqueNDigitNumber(10)}IN`,
      props.txnRef,
      TransactionType.IN,
      props.amount,
      props.currency,
      TransactionStatus.SUCCESS,
      props.referenceId,
      props.referenceType,
      props.description,
      props.metadata,
      props.transactionDate || new Date(),
      props.txnParticulars,
      props.accountId,
      props.sourceAccountId,
      new Date(),
      new Date(),
    );
    return transaction;
  }

  /**
   * Factory method to create a transaction (OUT - money going out)
   * Business validation: amount must be positive, accountId required
   */
  static createOut(props: {
    txnRef: string;
    amount: number;
    currency: string;
    accountId: string;
    description: string;
    referenceId?: string;
    referenceType?: TransactionRefType;
    txnParticulars?: string;
    destAccountId?: string;
    transactionDate?: Date;
    metadata?: Record<string, any>;
  }): Transaction {
    if (!props.amount || props.amount <= 0) {
      throw new BusinessException(
        "Transaction amount must be greater than zero",
      );
    }
    if (!props.currency) {
      throw new BusinessException("Currency is required");
    }
    if (!props.accountId) {
      throw new BusinessException("Account ID is required");
    }
    if (!props.description) {
      throw new BusinessException("Transaction description is required");
    }

    const transaction = new Transaction(
      `NTXN${generateUniqueNDigitNumber(10)}OU`,
      props.txnRef,
      TransactionType.OUT,
      props.amount,
      props.currency,
      TransactionStatus.SUCCESS,
      props.referenceId,
      props.referenceType,
      props.description,
      props.metadata,
      props.transactionDate || new Date(),
      props.txnParticulars,
      props.accountId,
      props.destAccountId,
    );

    return transaction;
  }

  /**
   * Revert a transaction
   * Business validation: Can only revert successful transactions
   */
  reverse(): void {
    if (this.#status !== TransactionStatus.SUCCESS) {
      throw new BusinessException("Can only revert successful transactions");
    }
    this.#status = TransactionStatus.REVERSED;
    this.touch();
  }

  get isEligibleForReverse(): boolean {
    return (
      this.#status === TransactionStatus.SUCCESS &&
      this.transactionDate >=
        new Date(new Date().setDate(new Date().getDate() - 10))
    );
  }

  // Getters
  get currency(): string {
    return this.#currency;
  }
  get referenceId(): string | undefined {
    return this.#referenceId;
  }
  get referenceType(): TransactionRefType | undefined {
    return this.#referenceType;
  }
  get description(): string {
    return this.#description;
  }
  get metadata(): Record<string, any> | undefined {
    return this.#metadata;
  }
  get transactionDate(): Date {
    return this.#transactionDate;
  }
  get amount(): number {
    return this.#amount;
  }
  get type(): TransactionType {
    return this.#type;
  }
  get status(): TransactionStatus {
    return this.#status;
  }
  get particulars(): string | undefined {
    return this.#particulars;
  }
  get transactionRef(): string {
    return this.#transactionRef;
  }
  get accountId(): string | undefined {
    return this.#accountId;
  }
  get refAccountId(): string | undefined {
    return this.#refAccountId;
  }
  get balanceAfter(): number | undefined {
    return this.#balanceAfter;
  }
}
