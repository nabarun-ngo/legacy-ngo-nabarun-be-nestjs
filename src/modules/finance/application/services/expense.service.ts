import { Inject,Injectable } from "@nestjs/common";
import { AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { toKeyValueDto } from "src/shared/utilities/kv-config.util";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";
import type { IExpenseRepository } from "../../domain/repositories/expense.repository.interface";
import { EXPENSE_REPOSITORY } from "../../domain/repositories/expense.repository.interface";
import { MetadataService } from "../../infrastructure/external/metadata.service";
import {
CreateExpenseDto,
ExpenseDetailDto,
ExpenseDetailFilterDto,
ExpenseRefDataDto,
UpdateExpenseDto,
} from "../dto/expense.dto";
import { ExpenseDtoMapper } from "../dto/mapper/expense-dto.mapper";
import { CreateExpenseUseCase } from "../use-cases/create-expense.use-case";
import { FinalizeExpenseUseCase } from "../use-cases/finalize-expense.use-case";
import { SettleExpenseUseCase } from "../use-cases/settle-expense.use-case";
import { UpdateExpenseUseCase } from "../use-cases/update-expense.use-case";

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: IExpenseRepository,
    private readonly createExpenseUseCase: CreateExpenseUseCase,
    private readonly updateExpenseUseCase: UpdateExpenseUseCase,
    private readonly settleExpenseUseCase: SettleExpenseUseCase,
    private readonly finalizeExpenseUseCase: FinalizeExpenseUseCase,
    private readonly metadataService: MetadataService,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) {}

  async list(
    filter: BaseFilter<ExpenseDetailFilterDto>,
  ): Promise<PagedResult<ExpenseDetailDto>> {
    const result = await this.expenseRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: filter.props,
    });
    return new PagedResult(
      result.content.map((e) => ExpenseDtoMapper.toDto(e)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async getById(id: string): Promise<ExpenseDetailDto> {
    const expense = await this.expenseRepository.findById(id);
    if (!expense) {
      throw new BusinessException("Expense not found with id: " + id);
    }
    return ExpenseDtoMapper.toDto(expense);
  }

  async create(
    dto: CreateExpenseDto,
    createdBy: AuthUser,
  ): Promise<ExpenseDetailDto> {
    const expense = await this.createExpenseUseCase.execute({
      requestedById: createdBy.profile_id!,
      paidById: dto.payerId,
      expenseRefType: dto.expenseRefType,
      currency: dto.currency,
      expenseDate: dto.expenseDate,
      expenseItems: dto.expenseItems,
      expenseRefId: dto.expenseRefId,
      name: dto.name,
      description: dto.description,
    });
    return ExpenseDtoMapper.toDto(expense);
  }

  async update(
    id: string,
    dto: UpdateExpenseDto,
    updatedById: string,
  ): Promise<ExpenseDetailDto> {
    const expense = await this.updateExpenseUseCase.execute({
      id,
      dto,
      updatedById,
    });
    return ExpenseDtoMapper.toDto(expense);
  }

  async settle(
    id: string,
    accountId: string,
    settledById: string,
  ): Promise<ExpenseDetailDto> {
    const expense = await this.settleExpenseUseCase.execute({
      id,
      accountId,
      settledById,
    });
    return ExpenseDtoMapper.toDto(expense);
  }

  async finalize(id: string, finalizedById: string): Promise<ExpenseDetailDto> {
    const expense = await this.finalizeExpenseUseCase.execute({
      id,
      finalizedById,
    });
    return ExpenseDtoMapper.toDto(expense);
  }

  async getReferenceData(): Promise<ExpenseRefDataDto> {
    const data = await this.metadataService.getReferenceData();
    return {
      expenseRefTypes: data.exp_categories.map(toKeyValueDto),
      expenseStatuses: data.exp_status.map(toKeyValueDto),
    };
  }
}
