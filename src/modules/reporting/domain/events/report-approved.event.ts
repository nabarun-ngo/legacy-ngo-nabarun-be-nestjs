import { DomainEvent } from "src/shared/models/domain-event";
import { Report } from "../models/report.model";

export class ReportApprovedEvent extends DomainEvent {
  constructor(public readonly report: Report) {
    super(report.id, report);
  }
}
