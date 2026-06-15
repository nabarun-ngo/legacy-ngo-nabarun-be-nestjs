import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
Beneficiary,
BeneficiaryFilterProps,
} from "../../domain/model/beneficiary.model";
import { IBeneficiaryRepository } from "../../domain/repositories/beneficiary.repository.interface";
import { ProjectInfraMapper } from "../project-infra.mapper";

@Injectable()
class BeneficiaryRepository implements IBeneficiaryRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: BeneficiaryFilterProps): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.beneficiary.count({ where });
  }

  async findPaged(
    filter?: BaseFilter<BeneficiaryFilterProps>,
  ): Promise<PagedResult<Beneficiary>> {
    const where = this.whereQuery(filter?.props);

    const [data, total] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where,
        orderBy: { enrollmentDate: "desc" },
        include: { project: true },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.beneficiary.count({ where }),
    ]);

    return new PagedResult<Beneficiary>(
      data.map((m) => ProjectInfraMapper.toBeneficiaryDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: BeneficiaryFilterProps): Promise<Beneficiary[]> {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: this.whereQuery(filter),
      orderBy: { enrollmentDate: "desc" },
      include: { project: true },
    });
    return beneficiaries.map((m) => ProjectInfraMapper.toBeneficiaryDomain(m)!);
  }

  private whereQuery(
    props?: BeneficiaryFilterProps,
  ): Prisma.BeneficiaryWhereInput {
    return {
      ...(props?.projectId ? { projectId: props.projectId } : {}),
      ...(props?.status ? { status: props.status } : {}),
      ...(props?.type ? { type: props.type } : {}),
      ...(props?.category
        ? { category: { contains: props.category, mode: "insensitive" } }
        : {}),
      deletedAt: null,
    };
  }

  async findById(id: string): Promise<Beneficiary | null> {
    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id },
      include: { project: true },
    });
    return ProjectInfraMapper.toBeneficiaryDomain(beneficiary);
  }

  async findByProjectId(projectId: string): Promise<Beneficiary[]> {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: { projectId, deletedAt: null },
      include: { project: true },
    });
    return beneficiaries.map((m) => ProjectInfraMapper.toBeneficiaryDomain(m)!);
  }

  async findByStatus(status: string): Promise<Beneficiary[]> {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: { status, deletedAt: null },
      include: { project: true },
    });
    return beneficiaries.map((m) => ProjectInfraMapper.toBeneficiaryDomain(m)!);
  }

  async findByType(type: string): Promise<Beneficiary[]> {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: { type, deletedAt: null },
      include: { project: true },
    });
    return beneficiaries.map((m) => ProjectInfraMapper.toBeneficiaryDomain(m)!);
  }

  async create(beneficiary: Beneficiary): Promise<Beneficiary> {
    const created = await this.prisma.beneficiary.create({
      data: ProjectInfraMapper.toBeneficiaryCreatePersistence(beneficiary),
      include: { project: true },
    });
    return ProjectInfraMapper.toBeneficiaryDomain(created)!;
  }

  async update(id: string, beneficiary: Beneficiary): Promise<Beneficiary> {
    const updated = await this.prisma.beneficiary.update({
      where: { id },
      data: ProjectInfraMapper.toBeneficiaryUpdatePersistence(beneficiary),
      include: { project: true },
    });
    return ProjectInfraMapper.toBeneficiaryDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.beneficiary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export { BeneficiaryRepository };
