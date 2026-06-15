import { DomainEvent } from "../../../../shared/models/domain-event";
import { WorkflowInstance } from "../model/workflow-instance.model";

export class StepCompletedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly stepId: string,
    public readonly domain: WorkflowInstance,
  ) {
    super(aggregateId, domain);
  }
}
