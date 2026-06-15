import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
Account,
BankDetail,
UPIDetail,
} from "../../domain/model/account.model";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";
import { ACCOUNT_REPOSITORY } from "../../domain/repositories/account.repository.interface";
import { UpdateAccountDto } from "../dto/account.dto";

@Injectable()
export class UpdateAccountUseCase
  implements IUseCase<{ id: string; dto: UpdateAccountDto }, Account>
{
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) {}

  async execute(request: {
    id: string;
    dto: UpdateAccountDto;
  }): Promise<Account> {
    const account = await this.accountRepository.findById(request.id);
    if (!account) {
      throw new BusinessException(`Account not found with id: ${request.id}`);
    }

    let bankDetail: BankDetail | undefined;
    if (request.dto.bankDetail) {
      bankDetail = new BankDetail(
        request.dto.bankDetail.bankAccountHolderName,
        request.dto.bankDetail.bankName,
        request.dto.bankDetail.bankBranch,
        request.dto.bankDetail.bankAccountNumber,
        request.dto.bankDetail.bankAccountType,
        request.dto.bankDetail.IFSCNumber,
      );
    }

    let upiDetail: UPIDetail | undefined;
    if (request.dto.upiDetail) {
      upiDetail = new UPIDetail(
        request.dto.upiDetail.payeeName,
        request.dto.upiDetail.upiId,
        request.dto.upiDetail.mobileNumber,
        request.dto.upiDetail.qrData,
      );
    }

    account.update({
      name: request.dto.name,
      description: request.dto.description,
      bankDetail,
      upiDetail,
      accountHolderName: request.dto.name,
    });

    if (request.dto.accountStatus) {
      if (request.dto.accountStatus === "ACTIVE") {
        account.activate();
      } else if (request.dto.accountStatus === "CLOSED") {
        account.close();
      }
    }

    const updatedAccount = await this.accountRepository.update(
      request.id,
      account,
    );
    return updatedAccount;
  }
}
