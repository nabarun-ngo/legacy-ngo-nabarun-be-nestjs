import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { ExpenseDetailFilterDto } from "../../application/dto/expense.dto";
import {
Expense,
ExpenseFilter,
ExpenseStatus,
} from "../../domain/model/expense.model";
import { IExpenseRepository } from "../../domain/repositories/expense.repository.interface";
import { ExpenseInfraMapper } from "../mapper/expense-infra.mapper";

export type ExpensePersistence = Prisma.ExpenseGetPayload<{
  include: {
    account: true;
    createdBy: true;
    updatedBy: true;
    finalizedBy: true;
    settledBy: true;
    rejectedBy: true;
    submittedBy: true;
    paidBy: true;
    activity: true;
  };
}>;

@Injectable()
class ExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: ExpenseFilter): Promise<number> {
    const where = this.whereQuery(filter);
    return await this.prisma.expense.count({ where });
  }

  async findPaged(
    filter?: BaseFilter<ExpenseDetailFilterDto>,
  ): Promise<PagedResult<Expense>> {
    const where = this.whereQuery(filter?.props);

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        include: {
          account: true,
          createdBy: true,
          updatedBy: true,
          finalizedBy: true,
          settledBy: true,
          rejectedBy: true,
          submittedBy: true,
          paidBy: true,
          activity: true,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return new PagedResult<Expense>(
      data.map((m) => ExpenseInfraMapper.toExpenseDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findAll(filter?: ExpenseDetailFilterDto): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: this.whereQuery(filter),
      orderBy: { expenseDate: "desc" },
      include: {
        account: true,
        createdBy: true,
        updatedBy: true,
        finalizedBy: true,
        settledBy: true,
        rejectedBy: true,
        submittedBy: true,
        paidBy: true,
        activity: true,
      },
    });

    return expenses.map((m) => ExpenseInfraMapper.toExpenseDomain(m)!);
  }

  private whereQuery(props?: ExpenseFilter): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = {
      ...(props?.expenseStatus ? { status: { in: props.expenseStatus } } : {}),
      ...(props?.expenseId ? { id: props.expenseId } : {}),
      ...(props?.payerId ? { paidById: props.payerId } : {}),
      ...(props?.expenseRefId ? { referenceId: props.expenseRefId } : {}),
      ...(props?.startDate || props?.endDate
        ? {
            expenseDate: {
              ...(props.startDate ? { gte: props.startDate } : {}),
              ...(props.endDate ? { lte: props.endDate } : {}),
            },
          }
        : {}),
      deletedAt: null,
    };
    return where;
  }

  async findById(id: string): Promise<Expense | null> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        account: true,
        createdBy: true,
        updatedBy: true,
        finalizedBy: true,
        settledBy: true,
        rejectedBy: true,
        submittedBy: true,
        paidBy: true,
        activity: true,
      },
    });

    return ExpenseInfraMapper.toExpenseDomain(expense!);
  }

  async findByStatus(status: ExpenseStatus): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { status, deletedAt: null },
      orderBy: { expenseDate: "desc" },
      include: {
        account: true,
        createdBy: true,
        updatedBy: true,
        finalizedBy: true,
        settledBy: true,
        rejectedBy: true,
        submittedBy: true,
        paidBy: true,
        activity: true,
      },
    });

    return expenses.map((m) => ExpenseInfraMapper.toExpenseDomain(m)!);
  }

  async findByRequestedBy(userId: string): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { createdById: userId, deletedAt: null },
      orderBy: { expenseDate: "desc" },
      include: {
        account: true,
        createdBy: true,
        updatedBy: true,
        finalizedBy: true,
        settledBy: true,
        rejectedBy: true,
        paidBy: true,
        submittedBy: true,
        activity: true,
      },
    });

    return expenses.map((m) => ExpenseInfraMapper.toExpenseDomain(m)!);
  }

  async create(expense: Expense): Promise<Expense> {
    const createData: Prisma.ExpenseUncheckedCreateInput = {
      ...ExpenseInfraMapper.toExpenseCreatePersistence(expense),
    };

    const created = await this.prisma.expense.create({
      data: createData,
      include: {
        account: true,
        createdBy: true,
        updatedBy: true,
        finalizedBy: true,
        settledBy: true,
        rejectedBy: true,
        submittedBy: true,
        paidBy: true,
        activity: true,
      },
    });

    return ExpenseInfraMapper.toExpenseDomain(created)!;
  }

  async update(id: string, expense: Expense): Promise<Expense> {
    const updateData: Prisma.ExpenseUncheckedUpdateInput = {
      ...ExpenseInfraMapper.toExpenseUpdatePersistence(expense),
    };

    const updated = await this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        account: true,
        createdBy: true,
        updatedBy: true,
        finalizedBy: true,
        settledBy: true,
        rejectedBy: true,
        paidBy: true,
        submittedBy: true,
        activity: true,
      },
    });

    return ExpenseInfraMapper.toExpenseDomain(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.expense.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export default ExpenseRepository;
