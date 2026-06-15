import { DomainEvent } from "../../../../shared/models/domain-event";
import { Role } from "../model/role.model";
import { User } from "../model/user.model";

export class RoleAssignedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly user: User,
    public readonly toAdd: Role[],
    public readonly toRemove: Role[],
  ) {
    super(aggregateId, user);
  }
}
