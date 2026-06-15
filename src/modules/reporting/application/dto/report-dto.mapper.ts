import { Report } from "../../domain/models/report.model";
import { ReportDefination } from "../../domain/reporting.interface";
import { ReportCategoryDto,ReportDetailDto } from "./report.dto";

export class ReportDtoMapper {
  static toReportDetailDTO(report: Report): ReportDetailDto {
    return {
      id: report.id,
      reportCode: report.reportCode,
      requestedById: report.requestedBy?.id,
      requestedByName: report.requestedBy
        ? report.requestedBy?.firstName + " " + report.requestedBy?.lastName
        : undefined,
      status: report.status,
      parameters: report.parameters,
      needApproval: report.needApproval,
      approvedBy: report.approvedBy?.id,
      approvedById: report.approvedBy?.id,
      approvedByName: report.approvedBy
        ? report.approvedBy?.firstName + " " + report.approvedBy?.lastName
        : undefined,
      approvedAt: report.approvedAt,
      approvers: report.approvers,
      viewers: report.viewers,
      dmsDocumentId: report.dmsDocumentId,
      version: report.version,
      workflowId: report.workflowId,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      reportName: report.reportName,
    };
  }

  static toReportCategoryDTO(category: ReportDefination): ReportCategoryDto {
    return {
      reportCode: category.reportCode,
      reportName: category.displayName,
      description: category.description,
      viewerRoles: category.visibleToRoles,
      manageRoles: category.approverRoles,
      isActive: category.isActive,
    };
  }
}
