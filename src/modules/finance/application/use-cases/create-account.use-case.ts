import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Role } from "src/modules/user/domain/model/role.model";
import {
type IUserRepository,
USER_REPOSITORY,
} from "src/modules/user/domain/repositories/user.repository.interface";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
Account,
AccountStatus,
AccountType,
} from "../../domain/model/account.model";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";
import { CreateAccountDto } from "../dto/account.dto";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

export class CreateAccountRequest {
  name: string;
  type: AccountType;
  currency: string;
  initialBalance?: number;
  description?: string;
  accountHolderId: string;
}

@Injectable()
export class CreateAccountUseCase
  implements IUseCase<CreateAccountDto, Account>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly transactionUseCase: CreateTransactionUseCase,
  ) {}

  async execute(request: CreateAccountDto): Promise<Account> {
    const user = await this.userRepository.findById(request.accountHolderId);
    if (!user) {
      throw new BusinessException(
        "User not found with id " + request.accountHolderId,
      );
    }

    let accountHolder: string | undefined;

    if (request.type !== AccountType.PRINCIPAL) {
      accountHolder = request.accountHolderId;
    }

    const existingAccount = await this.accountRepository.findAll({
      status: [AccountStatus.ACTIVE],
      type: [request.type],
      accountHolderId: accountHolder,
    });
    if (existingAccount.length > 0) {
      throw new BusinessException(
        `An active account of this type already exists${accountHolder ? " for this account holder" : ""}.`,
      );
    }

    if (request.type === AccountType.PRINCIPAL) {
      const role = user.roles.find((role) => role.roleCode === Role.TREASURER);
      if (!role) {
        throw new BusinessException(
          `Account Holder is not authorized to have this type of account`,
        );
      }
    }

    if (request.type === AccountType.DONATION) {
      const role = user.roles.find(
        (role) =>
          role.roleCode === Role.CASHIER ||
          role.roleCode === Role.ASSISTANT_CASHIER,
      );
      if (!role) {
        throw new BusinessException(
          `Account Holder is not authorized to have this type of account`,
        );
      }
    }

    const account = Account.create({
      name: request.name,
      type: request.type,
      currency: request.currency,
      description: request.description,
      accountHolderId: request.accountHolderId,
      accountHolderName: user.fullName,
    });

    const savedAccount = await this.accountRepository.create(account);

    // if (request?.initialBalance && request.initialBalance > 0) {
    //   await this.transactionUseCase.execute({
    //     accountId: savedAccount?.id!,
    //     txnAmount: request.initialBalance!,
    //     currency: 'INR',
    //     txnDescription: `Initial Balance for Account`,
    //     txnType: TransactionType.IN,
    //     txnDate: account.createdAt,
    //     txnRefType: TransactionRefType.NONE,
    //   })
    // }

    // Emit domain events
    for (const event of savedAccount.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    savedAccount.clearEvents();

    return savedAccount;
  }
}
