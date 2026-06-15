import { DomainEvent } from "../../../../shared/models/domain-event";
import { User } from "../model/user.model";

export class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly user: User,
  ) {
    super(aggregateId, user);
  }
}
