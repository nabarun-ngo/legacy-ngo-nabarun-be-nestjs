import { DomainEvent } from "../../../../shared/models/domain-event";
import { WorkflowInstance } from "../model/workflow-instance.model";

export class WorkflowCreatedEvent extends DomainEvent {
  instance: WorkflowInstance;
  constructor(instance: WorkflowInstance) {
    super(instance.id, instance);
    this.instance = instance;
  }
}
