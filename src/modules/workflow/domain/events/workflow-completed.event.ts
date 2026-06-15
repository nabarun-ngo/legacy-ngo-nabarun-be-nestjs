import { DomainEvent } from "../../../../shared/models/domain-event";
import { WorkflowInstance } from "../model/workflow-instance.model";

export class WorkflowCompletedEvent extends DomainEvent {
  data: WorkflowInstance;
  constructor(aggregateId: string, domain: WorkflowInstance) {
    super(aggregateId, domain);
    this.data = domain;
  }
}
