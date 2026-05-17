import { MapperUtils } from 'src/modules/shared/database/mapper-utils';
import { Report, ReportStatus } from '../domain/models/report.model';
import { Prisma } from '@prisma/client';

export type ReportPersistence = Prisma.ReportGetPayload<{
    select: {
        id: true,
        reportCode: true,
        reportName: true,
        requestedById: true,
        approvedById: true,
        status: true,
        parameters: true,
        needApproval: true,
        approvedAt: true,
        approvers: true,
        viewers: true,
        docId: true,
        workflowId: true,
        docVersion: true,
        createdAt: true,
        updatedAt: true,
        requestedBy: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
            }
        },
        approvedBy: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
            }
        },
    }
}>;

export class ReportInfraMapper {

    static toDomain(p: ReportPersistence): Report | null {
        if (!p) return null;

        return new Report(
            p.id,
            p.reportCode,
            p.reportName,
            p.requestedBy ? { id: p.requestedBy.id, firstName: p.requestedBy.firstName, lastName: p.requestedBy.lastName } : undefined,
            p.status as ReportStatus,
            (p.parameters as Record<string, any>) ?? undefined,
            p.needApproval,
            p.approvedBy ? { id: p.approvedBy.id, firstName: p.approvedBy.firstName, lastName: p.approvedBy.lastName } : undefined,
            MapperUtils.nullToUndefined(p.approvedAt),
            p.approvers ?? [],
            p.viewers ?? [],
            MapperUtils.nullToUndefined(p.docId),
            MapperUtils.nullToUndefined(p.workflowId),
            p.docVersion,
            p.createdAt,
            p.updatedAt,
        );
    }

    static toCreatePersistence(domain: Report): Prisma.ReportCreateInput {
        return {
            id: domain.id,
            reportCode: domain.reportCode,
            requestedBy: (domain.requestedBy?.id && domain.requestedBy.id !== 'system')
                ? { connect: { id: domain.requestedBy.id } }
                : undefined,
            status: domain.status,
            reportName: domain.reportName,
            parameters: domain.parameters ?? Prisma.DbNull,
            docId: MapperUtils.undefinedToNull(domain.dmsDocumentId),
            needApproval: domain.needApproval,
            approvedBy: (domain.approvedBy?.id && domain.approvedBy.id !== 'system')
                ? { connect: { id: domain.approvedBy.id } }
                : undefined,
            approvedAt: domain.approvedAt,
            approvers: domain.approvers,
            viewers: domain.viewers,
            docVersion: domain.version,
            createdAt: domain.createdAt,
            workflowId: domain.workflowId,
            updatedAt: domain.updatedAt,
        };
    }

    static toUpdatePersistence(domain: Report): Prisma.ReportUpdateInput {
        return {
            status: domain.status,
            reportName: domain.reportName,
            docId: MapperUtils.undefinedToNull(domain.dmsDocumentId),
            docVersion: domain.version,
            updatedAt: domain.updatedAt,
            approvedBy: domain.approvedBy
                ? (domain.approvedBy.id === 'system' ? undefined : { connect: { id: domain.approvedBy.id } })
                : { disconnect: true },
            workflowId: domain.workflowId,
            approvedAt: domain.approvedAt,
        };
    }
}
