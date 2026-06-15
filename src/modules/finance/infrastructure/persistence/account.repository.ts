import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { Account,AccountFilter } from "../../domain/model/account.model";
import { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { AccountInfraMapper } from "../mapper/account-infra.mapper";
import { TransactionInfraMapper } from "../mapper/transaction-infra.mapper";

export type OnlyAccount = Prisma.AccountGetPayload<{
  include: {
    accountHolder: true;
  };
}>;

export type AccountWithTransactions = Prisma.AccountGetPayload<{
  include: {
    accountHolder: true;
    transactions: true;
  };
}>;

@Injectable()
class AccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: AccountFilter): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.account.count({ where });
  }

  async findPaged(
    filter?: BaseFilter<AccountFilter>,
  ): Promise<PagedResult<Account>> {
    const where = this.whereQuery(filter?.props);

    const [data, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          accountHolder: true,
          transactions: filter?.props?.includeBalance ? true : false,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.account.count({ where }),
    ]);

    return new PagedResult<Account>(
      data.map((m) => AccountInfraMapper.toAccountDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: AccountFilter): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      where: this.whereQuery(filter),
      orderBy: { createdAt: "desc" },
      include: {
        accountHolder: true,
        transactions: filter?.includeBalance ? true : false,
      },
    });

    return accounts.map((m) => AccountInfraMapper.toAccountDomain(m)!);
  }

  private whereQuery(props?: AccountFilter): Prisma.AccountWhereInput {
    const where: Prisma.AccountWhereInput = {
      ...(props?.type && props.type.length > 0
        ? { type: { in: [...props.type] } }
        : {}),
      ...(props?.status && props.status.length > 0
        ? { status: { in: [...props.status] } }
        : {}),
      ...(props?.accountHolderId
        ? { accountHolderId: props.accountHolderId }
        : {}),
      ...(props?.id ? { id: props.id } : {}),
      deletedAt: null,
    };
    return where;
  }

  async findById(id: string): Promise<Account | null> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        accountHolder: true,
        transactions: true,
      },
    });

    return AccountInfraMapper.toAccountDomain(account!);
  }

  async create(account: Account): Promise<Account> {
    const createData: Prisma.AccountUncheckedCreateInput = {
      ...AccountInfraMapper.toAccountCreatePersistence(account),
      transactions: {
        create: account.transactions.map((m) => {
          const { accountId, ...createData } =
            TransactionInfraMapper.toTransactionCreatePersistence(m);
          return createData;
        }),
      },
    };

    const created = await this.prisma.account.create({
      data: createData,
      include: {
        accountHolder: true,
        transactions: true,
      },
    });

    return AccountInfraMapper.toAccountDomain(created)!;
  }

  async update(id: string, account: Account): Promise<Account> {
    const updateData: Prisma.AccountUncheckedUpdateInput = {
      ...AccountInfraMapper.toAccountUpdatePersistence(account),
      transactions: {
        upsert: account.transactions.map((m) => {
          const { accountId, ...createData } =
            TransactionInfraMapper.toTransactionCreatePersistence(m);
          return {
            where: { id: m.id },
            create: { ...createData, transactionRef: m.transactionRef },
            update: TransactionInfraMapper.toTransactionUpdatePersistence(m),
          };
        }),
      },
    };

    const updated = await this.prisma.account.update({
      where: { id },
      data: updateData,
      include: {
        accountHolder: true,
        transactions: true,
      },
    });

    return AccountInfraMapper.toAccountDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export default AccountRepository;
