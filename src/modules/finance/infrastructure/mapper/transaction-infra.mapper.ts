import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database";
import { Transaction,TransactionRefType,TransactionStatus,TransactionType } from "../../domain/model/transaction.model";
import { TransactionPersistence } from "../persistence/transaction.repository";

export class TransactionInfraMapper {
  // ===== TRANSACTION MAPPERS =====

  static toTransactionDomain(
    p: TransactionPersistence & { balanceAfter?: number },
  ): Transaction | null {
    if (!p) return null;

    return new Transaction(
      p.id,
      p.transactionRef,
      p.type as TransactionType,
      Number(p.amount),
      p.currency,
      p.status as TransactionStatus,
      MapperUtils.nullToUndefined(p.referenceId),
      MapperUtils.nullToUndefined(p.referenceType as TransactionRefType),
      p.description,
      MapperUtils.nullToUndefined(p.metadata) as
        | Record<string, any>
        | undefined,
      p.transactionDate,
      MapperUtils.nullToUndefined(p.particulars),
      MapperUtils.nullToUndefined(p.accountId),
      MapperUtils.nullToUndefined(p.refAccountId),
      p.createdAt,
      p.updatedAt,
      p.balanceAfter !== undefined ? Number(p.balanceAfter) : undefined,
    );
  }

  static toTransactionCreatePersistence(
    domain: Transaction,
  ): Prisma.TransactionUncheckedCreateInput {
    return {
      id: domain.id,
      transactionRef: domain.transactionRef,
      type: domain.type,
      amount: domain.amount,
      currency: domain.currency,
      status: domain.status,
      accountId: domain.accountId || null,
      referenceId: MapperUtils.undefinedToNull(domain.referenceId),
      referenceType: MapperUtils.undefinedToNull(domain.referenceType),
      description: domain.description,
      metadata: domain.metadata || Prisma.JsonNull,
      transactionDate: domain.transactionDate,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      particulars: domain.particulars,
      refAccountId: domain.refAccountId || null,
    };
  }

  static toTransactionUpdatePersistence(
    domain: Transaction,
  ): Prisma.TransactionUncheckedUpdateInput {
    return {
      status: domain.status,
      updatedAt: domain.updatedAt ?? new Date(),
    };
  }
}
