import { DomainEvent } from "src/shared/models/domain-event";
import { Account } from "../model/account.model";

export class AccountCreatedEvent extends DomainEvent {
  constructor(public readonly account: Account) {
    super(account.id, account);
  }
}
