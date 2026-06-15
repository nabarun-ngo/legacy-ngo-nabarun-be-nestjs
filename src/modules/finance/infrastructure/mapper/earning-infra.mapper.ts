import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database/mapper-utils";
import {
Earning,
EarningCategory,
EarningStatus,
} from "../../domain/model/earning.model";
import { EarningPersistence } from "../persistence/earning.repository";

export class EarningInfraMapper {
  // ===== EARNING MAPPERS =====

  static toEarningDomain(p: EarningPersistence): Earning | null {
    if (!p) return null;

    return new Earning(
      p.id,
      p.category as EarningCategory,
      Number(p.amount),
      p.currency,
      p.status as EarningStatus,
      p.description,
      p.source,
      MapperUtils.nullToUndefined(p.referenceId),
      MapperUtils.nullToUndefined(p.referenceType),
      MapperUtils.nullToUndefined(p.accountId),
      MapperUtils.nullToUndefined(p.transactionId),
      MapperUtils.nullToUndefined(p.earningDate),
      {
        id: p.createdBy?.id,
        fullName: `${p.createdBy?.firstName} ${p.createdBy?.lastName}`,
      },
      p.receivedBy
        ? {
            id: p.receivedBy.id,
            fullName: `${p.receivedBy.firstName} ${p.receivedBy.lastName}`,
          }
        : undefined,
      p.createdAt,
      p.updatedAt,
    );
  }

  static toEarningCreatePersistence(
    domain: Earning,
  ): Prisma.EarningCreateInput {
    return {
      id: domain.id,
      category: domain.category,
      amount: domain.amount,
      currency: domain.currency,
      status: domain.status,
      description: domain.description,
      source: domain.source,
      referenceId: MapperUtils.undefinedToNull(domain.referenceId),
      referenceType: MapperUtils.undefinedToNull(domain.referenceType),
      account: domain.accountId
        ? { connect: { id: domain.accountId } }
        : undefined,
      transactionId: MapperUtils.undefinedToNull(domain.transactionId),
      earningDate: MapperUtils.undefinedToNull(domain.earningDate),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  static toEarningUpdatePersistence(
    domain: Earning,
  ): Prisma.EarningUpdateInput {
    return {
      status: domain.status,
      category: domain.category,
      account: domain.accountId
        ? { connect: { id: domain.accountId } }
        : undefined,
      transactionId: MapperUtils.undefinedToNull(domain.transactionId),
      createdAt: domain.createdAt,
      amount: domain.amount,
      currency: domain.currency,
      description: domain.description,
      source: domain.source,
      referenceId: MapperUtils.undefinedToNull(domain.referenceId),
      referenceType: MapperUtils.undefinedToNull(domain.referenceType),
      earningDate: MapperUtils.undefinedToNull(domain.earningDate),
      updatedAt: domain.updatedAt,
    };
  }
}
