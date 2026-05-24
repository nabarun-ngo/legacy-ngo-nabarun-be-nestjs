import { Injectable } from '@nestjs/common';
import { IEarningRepository } from '../../domain/repositories/earning.repository.interface';
import { Earning, EarningCategory, EarningFilter } from '../../domain/model/earning.model';
import { Prisma } from '@prisma/client';
import { PrismaPostgresService } from 'src/modules/shared/database/prisma-postgres.service';
import { BaseFilter } from 'src/shared/models/base-filter-props';
import { PagedResult } from 'src/shared/models/paged-result';
import { EarningInfraMapper } from '../mapper/earning-infra.mapper';

export type EarningPersistence = Prisma.EarningGetPayload<{
  include: {
    account: true;
    createdBy: true;
    receivedBy: true;
  }
}>;

@Injectable()
class EarningRepository implements IEarningRepository {
  constructor(private readonly prisma: PrismaPostgresService) { }

  async count(filter: EarningFilter): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.earning.count({ where });
  }

  async findPaged(filter?: BaseFilter<EarningFilter>): Promise<PagedResult<Earning>> {
    const where = this.whereQuery(filter?.props);

    const [data, total] = await Promise.all([
      this.prisma.earning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          account: true,
          createdBy: true,
          receivedBy: true,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.earning.count({ where }),
    ]);

    return new PagedResult<Earning>(
      data.map(m => EarningInfraMapper.toEarningDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: EarningFilter): Promise<Earning[]> {
    const earnings = await this.prisma.earning.findMany({
      where: this.whereQuery(filter),
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
        createdBy: true,
        receivedBy: true,
      },
    });

    return earnings.map(m => EarningInfraMapper.toEarningDomain(m)!);
  }

  private whereQuery(props?: EarningFilter): Prisma.EarningWhereInput {
    const where: Prisma.EarningWhereInput = {
      ...(props?.category ? { category: { in: props.category } } : {}),
      ...(props?.source ? { source: props.source } : {}),
      ...(props?.status ? { status: { in: props.status } } : {}),
      ...(props?.startDate || props?.endDate
        ? {
          earningDate: {
            ...(props.startDate ? { gte: props.startDate } : {}),
            ...(props.endDate ? { lte: props.endDate } : {}),
          },
        }
        : {}),
      deletedAt: null,
    };
    return where;
  }

  async findById(id: string): Promise<Earning | null> {
    const earning = await this.prisma.earning.findUnique({
      where: { id },
      include: {
        account: true,
        createdBy: true,
        receivedBy: true,
      },
    });

    return EarningInfraMapper.toEarningDomain(earning!);
  }


  async create(earning: Earning): Promise<Earning> {
    const createData: Prisma.EarningUncheckedCreateInput = {
      ...EarningInfraMapper.toEarningCreatePersistence(earning),
    };

    const created = await this.prisma.earning.create({
      data: createData,
      include: {
        account: true,
        createdBy: true,
        receivedBy: true,
      },
    });

    return EarningInfraMapper.toEarningDomain(created)!;
  }

  async update(id: string, earning: Earning): Promise<Earning> {
    const updateData: Prisma.EarningUncheckedUpdateInput = {
      ...EarningInfraMapper.toEarningUpdatePersistence(earning),
    };

    const updated = await this.prisma.earning.update({
      where: { id },
      data: updateData,
      include: {
        account: true,
        createdBy: true,
        receivedBy: true,
      },
    });

    return EarningInfraMapper.toEarningDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.earning.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export default EarningRepository;
