import { Inject,Injectable } from "@nestjs/common";
import { ReportApprovedEvent } from "../../domain/events/report-approved.event";
import {
type IReportRepository,
REPORT_REPOSITORY,
} from "../../domain/repositories/report.repository.interface";

@Injectable()
export class ReportEventHandler {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: IReportRepository,
  ) {}

  async handleReportApproved(event: ReportApprovedEvent) {}
}
