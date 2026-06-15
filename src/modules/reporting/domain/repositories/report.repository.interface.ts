import { IRepository } from "src/shared/interfaces/repository.interface";
import { Report,ReportFilter } from "../models/report.model";

export interface IReportRepository
  extends IRepository<Report, string, ReportFilter> {
  findByReportCode(reportCode: string): Promise<Report[]>;
}

export const REPORT_REPOSITORY = Symbol("REPORT_REPOSITORY");
