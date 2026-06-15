import { DomainEvent } from "src/shared/models/domain-event";
import { Activity } from "../model/activity.model";

export class ActivityCompletedEvent extends DomainEvent {
  constructor(public readonly activity: Activity) {
    super(activity.id, activity);
  }
}
