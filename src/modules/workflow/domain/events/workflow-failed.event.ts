import { DomainEvent } from "../../../../shared/models/domain-event";
import { WorkflowInstance } from "../model/workflow-instance.model";

export class WorkflowFailedEvent extends DomainEvent {
  constructor(aggregateId: string, domain: WorkflowInstance) {
    super(aggregateId, domain);
  }
}
