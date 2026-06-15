import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
Transaction,
TransactionFilter
} from "../../domain/model/transaction.model";
import { ITransactionRepository } from "../../domain/repositories/transaction.repository.interface";
import { TransactionInfraMapper } from "../mapper/transaction-infra.mapper";

export type TransactionPersistence = Prisma.TransactionGetPayload<{
  include: {};
}>;

@Injectable()
class TransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: TransactionFilter): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.transaction.count({ where });
  }

  async findPaged(
    filter?: BaseFilter<TransactionFilter>,
  ): Promise<PagedResult<Transaction>> {
    const limit = filter?.pageSize ?? 1000;
    const offset = (filter?.pageIndex ?? 0) * limit;

    const accountCteFilter =
      filter?.props?.accountIds && filter.props.accountIds.length > 0
        ? Prisma.sql`AND "accountId" IN (${Prisma.join(filter.props.accountIds)})`
        : Prisma.empty;

    const conditions = this.getRawConditions(filter?.props);
    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;

    const data = await this.prisma.$queryRaw<any[]>`
      WITH balance_cte AS (
        SELECT 
          id,
          SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END) 
          OVER (PARTITION BY "accountId" ORDER BY "transactionDate" ASC, id ASC) as "balanceAfter"
        FROM transactions
        WHERE "deletedAt" IS NULL
        ${accountCteFilter}
      )
      SELECT t.*, b."balanceAfter", COUNT(*) OVER() as "totalCount"
      FROM transactions t
      JOIN balance_cte b ON t.id = b.id
      ${whereClause}
      ORDER BY t."transactionDate" DESC, t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = data.length > 0 ? Number(data[0].totalCount) : 0;

    return new PagedResult<Transaction>(
      data.map((m) => TransactionInfraMapper.toTransactionDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: TransactionFilter): Promise<Transaction[]> {
    const accountCteFilter =
      filter?.accountIds && filter.accountIds.length > 0
        ? Prisma.sql`AND "accountId" IN (${Prisma.join(filter.accountIds)})`
        : Prisma.empty;

    const conditions = this.getRawConditions(filter);
    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;

    const data = await this.prisma.$queryRaw<any[]>`
      WITH balance_cte AS (
        SELECT 
          id,
          SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END) 
          OVER (PARTITION BY "accountId" ORDER BY "transactionDate" ASC, id ASC) as "balanceAfter"
        FROM transactions
        WHERE "deletedAt" IS NULL
        ${accountCteFilter}
      )
      SELECT t.*, b."balanceAfter"
      FROM transactions t
      JOIN balance_cte b ON t.id = b.id
      ${whereClause}
      ORDER BY t."transactionDate" DESC, t.id DESC
    `;

    return data.map((m) => TransactionInfraMapper.toTransactionDomain(m)!);
  }

  private getRawConditions(props?: TransactionFilter): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [Prisma.sql`t."deletedAt" IS NULL`];
    if (props?.id) conditions.push(Prisma.sql`t.id = ${props.id}`);
    if (props?.type && props.type.length > 0)
      conditions.push(Prisma.sql`t.type IN (${Prisma.join(props.type)})`);
    if (props?.status && props.status.length > 0)
      conditions.push(Prisma.sql`t.status IN (${Prisma.join(props.status)})`);
    if (props?.accountIds && props.accountIds.length > 0)
      conditions.push(
        Prisma.sql`t."accountId" IN (${Prisma.join(props.accountIds)})`,
      );
    if (props?.referenceType && props.referenceType.length > 0)
      conditions.push(
        Prisma.sql`t."referenceType" IN (${Prisma.join(props.referenceType)})`,
      );
    if (props?.referenceId)
      conditions.push(Prisma.sql`t."referenceId" = ${props.referenceId}`);
    if (props?.transactionRef)
      conditions.push(Prisma.sql`t."transactionRef" = ${props.transactionRef}`);
    if (props?.startDate)
      conditions.push(Prisma.sql`t."transactionDate" >= ${props.startDate}`);
    if (props?.endDate)
      conditions.push(Prisma.sql`t."transactionDate" <= ${props.endDate}`);
    return conditions;
  }

  private whereQuery(props?: TransactionFilter): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {
      ...(props?.id ? { id: props.id } : {}),
      ...(props?.type ? { type: { in: props.type } } : {}),
      ...(props?.status ? { status: { in: props.status } } : {}),
      ...(props?.accountIds ? { accountId: { in: props.accountIds } } : {}),
      ...(props?.referenceType
        ? { referenceType: { in: props.referenceType } }
        : {}),
      ...(props?.referenceId ? { referenceId: props.referenceId } : {}),
      ...(props?.transactionRef
        ? { transactionRef: props.transactionRef }
        : {}),
      ...(props?.startDate || props?.endDate
        ? {
            transactionDate: {
              ...(props.startDate ? { gte: props.startDate } : {}),
              ...(props.endDate ? { lte: props.endDate } : {}),
            },
          }
        : {}),
      deletedAt: null,
    };
    return where;
  }

  async findById(id: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {},
    });

    return TransactionInfraMapper.toTransactionDomain(transaction!);
  }

  async create(transaction: Transaction): Promise<Transaction> {
    const createData: Prisma.TransactionUncheckedCreateInput = {
      ...TransactionInfraMapper.toTransactionCreatePersistence(transaction),
    };

    const created = await this.prisma.transaction.create({
      data: createData,
      include: {},
    });

    return TransactionInfraMapper.toTransactionDomain(created)!;
  }

  async update(id: string, transaction: Transaction): Promise<Transaction> {
    const updateData: Prisma.TransactionUncheckedUpdateInput = {
      ...TransactionInfraMapper.toTransactionUpdatePersistence(transaction),
    };

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {},
    });

    return TransactionInfraMapper.toTransactionDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export default TransactionRepository;
