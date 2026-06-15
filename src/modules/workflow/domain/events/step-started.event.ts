import { DomainEvent } from "../../../../shared/models/domain-event";
import { WorkflowInstance } from "../model/workflow-instance.model";

export class StepStartedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly instanceId: string,
    public readonly stepId: string,
    public readonly domain: WorkflowInstance,
  ) {
    super(aggregateId, domain);
  }
}
