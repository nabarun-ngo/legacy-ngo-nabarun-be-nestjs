import { BusinessException } from "src/shared/exceptions/business-exception";
import { AggregateRoot } from "src/shared/models/aggregate-root";
import { generateUniqueNDigitNumber } from "src/shared/utilities/password-util";
import { AccountCreatedEvent } from "../events/account-created.event";
import { TransactionCreatedEvent } from "../events/transaction-created.event";
import {
Transaction,
TransactionRefType,
TransactionType,
} from "./transaction.model";

export enum AccountType {
  PRINCIPAL = "PRINCIPAL", // Legacy: Principal account
  GENERAL = "GENERAL", // Legacy: General account // Not in use
  DONATION = "DONATION", // Legacy: Donation account // Cashier Account
  PUBLIC_DONATION = "PUBLIC_DONATION", // Legacy: Public donation account
  WALLET = "WALLET",
}
export enum AccountStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
}

/**
 * Bank Detail Value Object
 */
export class BankDetail {
  constructor(
    public bankAccountHolderName?: string,
    public bankName?: string,
    public bankBranch?: string,
    public bankAccountNumber?: string,
    public bankAccountType?: string,
    public IFSCNumber?: string,
  ) {}
}

class TxnDetail {
  transactionRef: string;
  referenceId?: string;
  referenceType?: TransactionRefType;
  description: string;
  txnDate: Date;
  refAccountId?: string;
}

/**
 * UPI Detail Value Object
 */
export class UPIDetail {
  constructor(
    public payeeName?: string,
    public upiId?: string,
    public mobileNumber?: string,
    public qrData?: string,
  ) {}
}

export interface AccountFilter {
  id?: string;
  type?: AccountType[];
  status?: AccountStatus[];
  accountHolderName?: string;
  accountHolderId?: string;
  includeBalance?: boolean;
}

/**
 * Account Domain Model (Aggregate Root)
 * Represents a financial account in the system
 * All business logic and validations are in this domain model
 */
export class Account extends AggregateRoot<string> {
  // Private fields for encapsulation
  #name: string;
  #type: AccountType;
  #currency: string;
  #status: AccountStatus;
  #description: string | undefined;
  #accountHolderName: string | undefined;
  #accountHolderId: string | undefined;
  #activatedOn: Date | undefined;
  #bankDetail: BankDetail | undefined;
  #upiDetail: UPIDetail | undefined;
  #transactions: Transaction[] = [];

  constructor(
    id: string,
    name: string,
    type: AccountType,
    currency: string,
    status: AccountStatus,
    description: string | undefined,
    transactions: Transaction[] = [],
    accountHolderName?: string,
    accountHolderId?: string,
    activatedOn?: Date,
    bankDetail?: BankDetail,
    upiDetail?: UPIDetail,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#name = name;
    this.#type = type;
    this.#currency = currency;
    this.#status = status;
    this.#description = description;
    this.#accountHolderName = accountHolderName;
    this.#accountHolderId = accountHolderId;
    this.#activatedOn = activatedOn;
    this.#bankDetail = bankDetail;
    this.#upiDetail = upiDetail;
    this.#transactions = transactions;
  }

  /**
   * Factory method to create a new Account
   * Business validation: name and currency required, initialBalance must be non-negative
   */
  static create(props: {
    name: string;
    type: AccountType;
    currency: string;
    initialBalance?: number;
    description?: string;
    accountHolderId?: string;
    accountHolderName?: string;
    bankDetail?: BankDetail;
    upiDetail?: UPIDetail;
  }): Account {
    if (!props.name || props.name.trim().length === 0) {
      throw new BusinessException("Account name is required");
    }
    if (!props.currency || props.currency.trim().length === 0) {
      throw new BusinessException("Currency is required");
    }
    if (props.initialBalance !== undefined && props.initialBalance < 0) {
      throw new BusinessException("Initial balance cannot be negative");
    }

    const now = new Date();
    const account = new Account(
      `NACC${generateUniqueNDigitNumber(8)}`,
      props.name,
      props.type,
      props.currency,
      AccountStatus.ACTIVE,
      props.description,
      [],
      props.accountHolderName,
      props.accountHolderId,
      now, // activatedOn
      props.bankDetail,
      props.upiDetail,
      now,
      now,
    );
    if (props.initialBalance) {
      account.credit(props.initialBalance, {
        transactionRef: `TXR${generateUniqueNDigitNumber(10)}`,
        description: "Initial balance",
        txnDate: now,
      });
    }
    account.addDomainEvent(new AccountCreatedEvent(account));
    return account;
  }

  /**
   * Credit amount to account (add money)
   * Business validation: amount must be positive, account must be active
   */
  credit(amount: number, txnDetail: TxnDetail): void {
    if (amount <= 0) {
      throw new BusinessException("Credit amount must be positive");
    }

    if (this.#status !== AccountStatus.ACTIVE) {
      throw new BusinessException(
        "Cannot credit to inactive or blocked account",
      );
    }

    const transaction = Transaction.createIn({
      txnRef: txnDetail.transactionRef,
      amount: amount,
      currency: this.#currency,
      accountId: this.id,
      txnParticulars: `Credit ${this.#currency} ${amount} to account ${this.id} for ${txnDetail.description}`,
      referenceId: txnDetail.referenceId,
      referenceType: txnDetail.referenceType,
      description: txnDetail.description,
      transactionDate: txnDetail.txnDate,
      sourceAccountId: txnDetail.refAccountId,
    });

    this.#transactions.push(transaction);
    this.addDomainEvent(new TransactionCreatedEvent(transaction));
    this.touch();
  }

  /**
   * Debit amount from account (remove money)
   * Business validation: amount must be positive, account must be active, sufficient balance
   */
  debit(amount: number, txnDetail: TxnDetail): void {
    if (amount <= 0) {
      throw new BusinessException("Debit amount must be positive");
    }

    if (this.#status !== AccountStatus.ACTIVE) {
      throw new BusinessException(
        "Cannot debit from inactive or blocked account",
      );
    }

    if (!this.hasSufficientFunds(amount)) {
      throw new BusinessException("You dont have sufficiend balance.");
    }

    const transaction = Transaction.createOut({
      txnRef: txnDetail.transactionRef,
      amount: amount,
      currency: this.#currency,
      accountId: this.id,
      txnParticulars: `Debit ${this.#currency} ${amount} from account ${this.id} for ${txnDetail.description}`,
      referenceId: txnDetail.referenceId,
      referenceType: txnDetail.referenceType,
      description: txnDetail.description,
      transactionDate: txnDetail.txnDate,
      destAccountId: txnDetail.refAccountId,
    });

    this.#transactions.push(transaction);
    this.addDomainEvent(new TransactionCreatedEvent(transaction));
    this.touch();
  }

  /**
   * Close account
   * Business validation: Cannot close closed account
   */
  close(): void {
    if (this.#status === AccountStatus.CLOSED) {
      throw new BusinessException("Cannot close a already closed account");
    }
    if (this.balance !== 0) {
      throw new BusinessException("Cannot close an account with balance");
    }
    this.#status = AccountStatus.CLOSED;
    this.touch();
  }

  /**
   * Activate account
   * Business validation: Cannot activate blocked account
   */
  activate(): void {
    if (this.#status === AccountStatus.CLOSED) {
      throw new BusinessException("Cannot activate a closed account");
    }
    this.#status = AccountStatus.ACTIVE;
    if (!this.#activatedOn) {
      this.#activatedOn = new Date();
    }
    this.touch();
  }

  /**
   * Update account details
   * Business validation: Cannot change type, can update name, description, bank/UPI details
   */
  update(props: {
    name?: string;
    description?: string;
    bankDetail?: BankDetail;
    upiDetail?: UPIDetail;
    accountHolderName?: string;
  }): void {
    if (props.name !== undefined) {
      if (!props.name || props.name.trim().length === 0) {
        throw new BusinessException("Account name cannot be empty");
      }
      this.#name = props.name;
    }
    if (props.description !== undefined) {
      this.#description = props.description;
    }
    if (props.bankDetail !== undefined) {
      this.#bankDetail = props.bankDetail;
    }
    if (props.upiDetail !== undefined) {
      this.#upiDetail = props.upiDetail;
    }
    if (props.accountHolderName !== undefined) {
      this.#accountHolderName = props.accountHolderName;
    }
    this.touch();
  }

  // Getters
  get name(): string {
    return this.#name;
  }
  get type(): AccountType {
    return this.#type;
  }
  get balance(): number {
    return this.#transactions.reduce((acc, txn) => {
      if (txn.type === TransactionType.IN) {
        return acc + (txn.amount ?? 0);
      } else {
        return acc - (txn.amount ?? 0);
      }
    }, 0);
  }
  get currency(): string {
    return this.#currency;
  }
  get status(): AccountStatus {
    return this.#status;
  }
  get description(): string | undefined {
    return this.#description;
  }
  get accountHolderName(): string | undefined {
    return this.#accountHolderName;
  }
  get accountHolderId(): string | undefined {
    return this.#accountHolderId;
  }
  get activatedOn(): Date | undefined {
    return this.#activatedOn;
  }
  get bankDetail(): BankDetail | undefined {
    return this.#bankDetail;
  }
  get upiDetail(): UPIDetail | undefined {
    return this.#upiDetail;
  }
  get transactions(): ReadonlyArray<Transaction> {
    return this.#transactions;
  }

  /**
   * Check if account has sufficient funds
   */
  hasSufficientFunds(amount: number): boolean {
    return this.balance >= amount;
  }

  /**
   * Check if account is active
   */
  isActive(): boolean {
    return this.#status === AccountStatus.ACTIVE;
  }
}
