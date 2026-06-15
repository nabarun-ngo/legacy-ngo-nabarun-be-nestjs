import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database/mapper-utils";
import {
Account,
AccountStatus,
AccountType,
} from "../../domain/model/account.model";
import { AccountWithTransactions } from "../persistence/account.repository";
import { TransactionInfraMapper } from "./transaction-infra.mapper";

export class AccountInfraMapper {
  // ===== ACCOUNT MAPPERS =====

  static toAccountDomain(p: AccountWithTransactions): Account | null {
    if (!p) return null;

    return new Account(
      p.id,
      p.name,
      p.type as AccountType,
      p.currency,
      p.status as AccountStatus,
      MapperUtils.nullToUndefined(p.description),
      p.transactions?.map(
        (t) => TransactionInfraMapper.toTransactionDomain(t as any)!,
      ) ?? [],
      `${p.accountHolder?.firstName} ${p.accountHolder?.lastName}`,
      MapperUtils.nullToUndefined(p.accountHolderId),
      MapperUtils.nullToUndefined(p.activatedOn),
      p.bankDetail ? JSON.parse(p.bankDetail) : undefined,
      p.upiDetail ? JSON.parse(p.upiDetail) : undefined,
      p.createdAt,
      p.updatedAt,
    );
  }

  static toAccountCreatePersistence(
    domain: Account,
  ): Prisma.AccountCreateInput {
    return {
      id: domain.id,
      name: domain.name,
      type: domain.type,
      currency: domain.currency,
      status: domain.status,
      balance: 0,
      description: MapperUtils.undefinedToNull(domain.description),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      bankDetail: domain.bankDetail
        ? JSON.stringify(domain.bankDetail)
        : undefined,
      upiDetail: domain.upiDetail
        ? JSON.stringify(domain.upiDetail)
        : undefined,
      accountHolder: { connect: { id: domain.accountHolderId } },
      activatedOn: domain.activatedOn,
    };
  }

  static toAccountUpdatePersistence(
    domain: Account,
  ): Prisma.AccountUncheckedUpdateInput {
    return {
      name: domain.name,
      status: domain.status,
      description: MapperUtils.undefinedToNull(domain.description),
      updatedAt: new Date(),
      bankDetail: domain.bankDetail
        ? JSON.stringify(domain.bankDetail)
        : undefined,
      upiDetail: domain.upiDetail
        ? JSON.stringify(domain.upiDetail)
        : undefined,
      activatedOn: domain.activatedOn,
      currency: domain.currency,
      type: domain.type,
    };
  }
}
