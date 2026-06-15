import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database";
import { UserInfraMapper } from "src/modules/user/infrastructure/user-infra.mapper";
import {
Expense,
ExpenseItem,
ExpenseRefType,
ExpenseStatus,
} from "../../domain/model/expense.model";
import { ExpensePersistence } from "../persistence/expense.repository";

export class ExpenseInfraMapper {
  // ===== EXPENSE MAPPERS =====

  static toExpenseDomain(p: ExpensePersistence): Expense | null {
    if (!p) return null;

    // Parse expense items from JSON string if present
    let expenseItems: ExpenseItem[] = [];
    if (p.items) {
      try {
        const parsed = JSON.parse(p.items);
        expenseItems = Array.isArray(parsed) ? parsed : [];
      } catch {
        // If parsing fails, treat as empty array
        expenseItems = [];
      }
    }

    return new Expense(
      p.id,
      p.title || "Expense", // Map title to name
      Number(p.amount),
      p.currency,
      p.status as ExpenseStatus,
      MapperUtils.nullToUndefined(p.description) || "",
      MapperUtils.nullToUndefined(p.referenceId),
      MapperUtils.nullToUndefined(p.referenceType as ExpenseRefType),
      MapperUtils.nullToUndefined(p.activity?.name || null),
      MapperUtils.nullToUndefined(
        UserInfraMapper.toUserDomain(p.createdBy as any),
      )!,
      MapperUtils.nullToUndefined(
        UserInfraMapper.toUserDomain(p.submittedBy as any),
      ),
      MapperUtils.nullToUndefined(
        UserInfraMapper.toUserDomain(p.finalizedBy as any),
      ),
      MapperUtils.nullToUndefined(
        UserInfraMapper.toUserDomain(p.settledBy as any),
      ),
      MapperUtils.nullToUndefined(
        UserInfraMapper.toUserDomain(p.rejectedBy as any),
      ),
      MapperUtils.nullToUndefined(
        UserInfraMapper.toUserDomain(p.paidBy as any),
      )!,
      MapperUtils.nullToUndefined(p.accountId),
      MapperUtils.nullToUndefined(p.transactionRef),
      p.expenseDate,
      MapperUtils.nullToUndefined(p.submittedOn),
      MapperUtils.nullToUndefined(p.finalizedOn),
      MapperUtils.nullToUndefined(p.settledOn),
      MapperUtils.nullToUndefined(p.rejectedOn),
      expenseItems,
      MapperUtils.nullToUndefined(p.transactionRef), // txnNumber
      MapperUtils.nullToUndefined(p.remarks),
      p.isDelegated,
      p.createdAt,
      p.updatedAt,
    );
  }

  static toExpenseCreatePersistence(
    domain: Expense,
  ): Prisma.ExpenseUncheckedCreateInput {
    // Serialize expense items to JSON string
    const itemsJson =
      domain.expenseItems.length > 0
        ? JSON.stringify(domain.expenseItems)
        : null;

    return {
      id: domain.id,
      title: domain.name, // Map name to title
      items: itemsJson,
      amount: domain.amount,
      currency: domain.currency,
      status: domain.status,
      description: domain.description,
      referenceId: MapperUtils.undefinedToNull(domain.referenceId),
      referenceType: MapperUtils.undefinedToNull(domain.referenceType),
      isDelegated: domain.isDelegated,
      createdById: domain.requestedBy?.id ?? "", // Map requestedBy to createdById
      paidById: domain.paidBy?.id ?? "",
      finalizedById: domain.finalizedBy?.id ?? undefined,
      finalizedOn: MapperUtils.undefinedToNull(domain.finalizedDate),
      settledById: domain.settledBy?.id ?? undefined,
      settledOn: MapperUtils.undefinedToNull(domain.settledDate),
      rejectedById: domain.rejectedBy?.id ?? undefined,
      updatedById: domain.requestedBy?.id ?? undefined, // Default to creator
      updatedOn: domain.updatedAt,
      accountId: domain.accountId ?? null,
      transactionRef: MapperUtils.undefinedToNull(domain.transactionId),
      expenseDate: domain.expenseDate,
      submittedById: domain.requestedBy?.id ?? "",
      submittedOn: domain.submittedDate,
      rejectedOn: domain.rejectedDate,
      remarks: MapperUtils.undefinedToNull(domain.remarks),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  static toExpenseUpdatePersistence(
    domain: Expense,
  ): Prisma.ExpenseUncheckedUpdateInput {
    // Serialize expense items to JSON string
    const itemsJson =
      domain.expenseItems.length > 0
        ? JSON.stringify(domain.expenseItems)
        : null;

    return {
      title: domain.name, // Map name to title
      items: itemsJson,
      amount: domain.amount,
      currency: domain.currency,
      status: domain.status,
      description: domain.description,
      referenceId: MapperUtils.undefinedToNull(domain.referenceId),
      referenceType: MapperUtils.undefinedToNull(domain.referenceType),
      isDelegated: domain.isDelegated,
      createdById: domain.requestedBy?.id ?? undefined,
      paidById: domain.paidBy?.id ?? "",
      finalizedById: domain.finalizedBy?.id ?? undefined,
      finalizedOn: MapperUtils.undefinedToNull(domain.finalizedDate),
      settledById: domain.settledBy?.id ?? undefined,
      settledOn: MapperUtils.undefinedToNull(domain.settledDate),
      rejectedById: domain.rejectedBy?.id ?? undefined,
      updatedById: domain.requestedBy?.id ?? undefined,
      updatedOn: domain.updatedAt,
      accountId: domain.accountId ?? null,
      transactionRef: MapperUtils.undefinedToNull(domain.transactionId),
      expenseDate: domain.expenseDate,
      submittedById: domain.requestedBy?.id ?? "",
      submittedOn: domain.submittedDate,
      rejectedOn: domain.rejectedDate,
      remarks: MapperUtils.undefinedToNull(domain.remarks),
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
