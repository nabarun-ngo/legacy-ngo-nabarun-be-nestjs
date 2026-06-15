import { DomainEvent } from "src/shared/models/domain-event";
import { Transaction } from "../model/transaction.model";

export class TransactionCreatedEvent extends DomainEvent {
  constructor(public readonly transaction: Transaction) {
    super(transaction.id, transaction);
  }
}
