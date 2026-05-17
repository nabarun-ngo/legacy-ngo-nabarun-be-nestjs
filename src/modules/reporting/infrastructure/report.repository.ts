import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaPostgresService } from 'src/modules/shared/database/prisma-postgres.service';
import { BaseFilter } from 'src/shared/models/base-filter-props';
import { PagedResult } from 'src/shared/models/paged-result';
import { IReportRepository } from '../domain/repositories/report.repository.interface';
import { ReportFilter, Report } from '../domain/models/report.model';
import { ReportInfraMapper } from './report-infra.mapper';


@Injectable()
export class ReportRepository implements IReportRepository {
    constructor(private readonly prisma: PrismaPostgresService) { }

    async count(filter: ReportFilter): Promise<number> {
        return this.prisma.report.count({ where: this.whereQuery(filter) });
    }

    private readonly includeUsers = {
        requestedBy: {
            select: {
                firstName: true,
                lastName: true,
            }
        },
        approvedBy: {
            select: {
                firstName: true,
                lastName: true,
            }
        }
    };

    async findPaged(filter?: BaseFilter<ReportFilter>): Promise<PagedResult<Report>> {
        const where = this.whereQuery(filter?.props);
        const [data, total] = await Promise.all([
            this.prisma.report.findMany({
                where,
                include: this.includeUsers,
                orderBy: { createdAt: 'desc' },
                skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 20),
                take: filter?.pageSize ?? 20,
            }),
            this.prisma.report.count({ where }),
        ]);

        return new PagedResult<Report>(
            data.map(r => ReportInfraMapper.toDomain(r as any)!),
            total,
            filter?.pageIndex ?? 0,
            filter?.pageSize ?? 20,
        );
    }

    async findAll(filter?: ReportFilter): Promise<Report[]> {
        const data = await this.prisma.report.findMany({
            where: this.whereQuery(filter),
            include: this.includeUsers,
            orderBy: { createdAt: 'desc' },
        });
        return data.map(r => ReportInfraMapper.toDomain(r as any)!);
    }

    async findById(id: string): Promise<Report | null> {
        const data = await this.prisma.report.findUnique({
            where: { id },
            include: this.includeUsers,
        });
        return data ? ReportInfraMapper.toDomain(data as any) : null;
    }

    async findByReportCode(reportCode: string): Promise<Report[]> {
        const data = await this.prisma.report.findMany({
            where: { reportCode },
            include: this.includeUsers,
            orderBy: { createdAt: 'desc' },
        });
        return data.map(r => ReportInfraMapper.toDomain(r as any)!);
    }

    async create(entity: Report): Promise<Report> {
        const created = await this.prisma.report.create({
            data: ReportInfraMapper.toCreatePersistence(entity),
            include: this.includeUsers,
        });
        return ReportInfraMapper.toDomain(created as any)!;
    }

    async update(id: string, entity: Report): Promise<Report> {
        const updated = await this.prisma.report.update({
            where: { id },
            data: ReportInfraMapper.toUpdatePersistence(entity),
            include: this.includeUsers,
        });
        return ReportInfraMapper.toDomain(updated as any)!;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.report.delete({ where: { id } });
    }

    private whereQuery(filter?: ReportFilter): Prisma.ReportWhereInput {
        return {
            ...(filter?.reportCode ? { reportCode: filter.reportCode } : {}),
            ...(filter?.status?.length ? { status: { in: filter.status } } : {}),
            ...(filter?.requestedById ? { requestedById: filter.requestedById } : {}),
        };
    }
}
