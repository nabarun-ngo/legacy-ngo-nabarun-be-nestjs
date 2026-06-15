import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { toKeyValueDto } from "src/shared/utilities/kv-config.util";
import {
AccountStatus,
AccountType
} from "../../domain/model/account.model";
import {
TransactionRefType,
TransactionType,
} from "../../domain/model/transaction.model";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";
import {
type ITransactionRepository,
TRANSACTION_REPOSITORY,
} from "../../domain/repositories/transaction.repository.interface";
import { MetadataService } from "../../infrastructure/external/metadata.service";
import {
AccountDetailDto,
AccountDetailFilterDto,
AccountRefDataDto,
AddFundDto,
CreateAccountDto,
TransferDto,
UpdateAccountDto
} from "../dto/account.dto";
import { AccountDtoMapper } from "../dto/mapper/account-dto.mapper";
import { TransactionDtoMapper } from "../dto/mapper/transaction-dto.mapper";
import {
CreateTransactionDto,
ReverseTransactionDto,
TransactionDetailDto,
TransactionDetailFilterDto,
} from "../dto/transaction.dto";
import { CreateAccountUseCase } from "../use-cases/create-account.use-case";
import { CreateTransactionUseCase } from "../use-cases/create-transaction.use-case";
import { ReverseTransactionUseCase } from "../use-cases/reverse-transaction.use-case";
import { UpdateAccountUseCase } from "../use-cases/update-account.use-case";

@Injectable()
export class AccountService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly metadataService: MetadataService,
    private readonly reverseTransactionUseCase: ReverseTransactionUseCase,
  ) {}

  async list(
    filter: BaseFilter<AccountDetailFilterDto>,
    userId?: string,
  ): Promise<PagedResult<AccountDetailDto>> {
    const result = await this.accountRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: {
        accountHolderId: userId ?? filter.props?.accountHolderId,
        id: filter.props?.accountId,
        status: filter.props?.status,
        type: filter.props?.type,
        includeBalance: filter?.props?.includeBalance === "Y",
      },
    });

    return new PagedResult(
      result.content.map((a) =>
        AccountDtoMapper.toDto(a, {
          includeBankDetail: filter.props?.includePaymentDetail === "Y",
          includeUpiDetail: filter.props?.includePaymentDetail === "Y",
        }),
      ),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async getById(id: string): Promise<AccountDetailDto> {
    const account = await this.accountRepository.findById(id);
    if (!account) {
      throw new BusinessException("Account not found with id " + id);
    }
    return AccountDtoMapper.toDto(account, {
      includeBankDetail: true,
      includeUpiDetail: true,
    });
  }

  async create(dto: CreateAccountDto): Promise<AccountDetailDto> {
    const account = await this.createAccountUseCase.execute(dto);
    return AccountDtoMapper.toDto(account, {
      includeBankDetail: true,
      includeUpiDetail: true,
    });
  }

  async payableAccount(isTransfer: boolean): Promise<AccountDetailDto[]> {
    const account = await this.accountRepository.findAll({
      type:
        isTransfer === true
          ? []
          : [
              AccountType.PRINCIPAL,
              AccountType.DONATION,
              AccountType.PUBLIC_DONATION,
            ],
      status: [AccountStatus.ACTIVE],
      includeBalance: false,
    });
    return account.map((a) =>
      AccountDtoMapper.toDto(a, {
        includeBankDetail: true,
        includeUpiDetail: true,
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
    userId?: string,
  ): Promise<AccountDetailDto> {
    const account = await this.updateAccountUseCase.execute({ id, dto });
    return AccountDtoMapper.toDto(account, {
      includeBankDetail: true,
      includeUpiDetail: true,
    });
  }

  async createTransaction(
    accountId: string,
    dto: CreateTransactionDto,
  ): Promise<string> {
    const transaction = await this.createTransactionUseCase.execute({
      ...dto,
      accountId,
      currency: "INR",
    });
    return transaction;
  }

  async listTransactions(
    accountId: string,
    filter: BaseFilter<TransactionDetailFilterDto>,
    userId?: string,
  ): Promise<PagedResult<TransactionDetailDto>> {
    // Add accountId to filter
    const account = await this.accountRepository.findById(accountId);
    if (userId && account?.accountHolderId !== userId) {
      throw new BusinessException("Account does not belongs to user.");
    }
    const result = await this.transactionRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: {
        accountIds: [accountId],
        transactionRef: filter.props?.transactionRef,
        type: filter.props?.txnType,
        status: filter.props?.txnStatus,
        startDate: filter.props?.startDate,
        endDate: filter.props?.endDate,
        id: filter.props?.txnId,
      },
    });
    return new PagedResult(
      result.content.map((t) => TransactionDtoMapper.toDto(t)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async transferAmount(
    accountId: string,
    dto: TransferDto,
    profile_id: string | undefined,
  ) {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new BusinessException("Account not found with id " + accountId);
    }
    if (profile_id && account.accountHolderId !== profile_id) {
      throw new BusinessException("Account does not belongs to user.");
    }
    const transaction = await this.createTransactionUseCase.execute({
      accountId,
      transferToAccountId: dto.toAccountId,
      txnAmount: dto.amount,
      txnDescription: dto.description,
      txnDate: dto.transferDate,
      txnType: "TRANSFER",
      currency: "INR",
      txnRefType: TransactionRefType.NONE,
    });
    return transaction;
  }

  async addFundToAccount(
    accountId: string,
    dto: AddFundDto,
    profile_id: string | undefined,
  ) {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new BusinessException("Account not found with id " + accountId);
    }
    if (profile_id && account.accountHolderId !== profile_id) {
      throw new BusinessException("Account does not belongs to user.");
    }

    const transaction = await this.createTransactionUseCase.execute({
      txnAmount: dto.amount,
      currency: "INR",
      txnDescription: `Add fund : ${dto.description}`,
      txnRefId: accountId,
      txnRefType: TransactionRefType.NONE,
      accountId: accountId,
      txnDate: dto.transferDate,
      txnType: TransactionType.IN,
    });
    return transaction;
  }

  async reverseTransaction(accountId: string, dto: ReverseTransactionDto) {
    const transaction = await this.reverseTransactionUseCase.execute({
      reason: dto.comment,
      transactionRef: dto.transactionRef,
    });
    return transaction;
  }

  async getReferenceData(): Promise<AccountRefDataDto> {
    const data = await this.metadataService.getReferenceData();
    return {
      accountStatuses: data.acc_status.map(toKeyValueDto),
      accountTypes: data.acc_type.map(toKeyValueDto),
      transactionRefTypes: data.txn_types.map(toKeyValueDto),
    };
  }
}
