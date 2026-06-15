import {
Account,
BankDetail,
UPIDetail,
} from "../../../domain/model/account.model";
import {
AccountDetailDto,
BankDetailDto,
UPIDetailDto,
} from "../../dto/account.dto";

/**
 * Account DTO Mapper
 */
export class AccountDtoMapper {
  static toDto(
    account: Account,
    options: {
      includeBankDetail?: boolean;
      includeUpiDetail?: boolean;
    },
  ): AccountDetailDto {
    return {
      id: account.id,
      balance: account.balance,
      accountHolderName: account.accountHolderName,
      accountHolder: account.accountHolderId, // UserDetail reference - would need to fetch
      accountStatus: account.status,
      activatedOn: account.activatedOn,
      accountType: account.type,
      bankDetail:
        account.bankDetail && options.includeBankDetail
          ? this.bankDetailToDto(account.bankDetail)
          : undefined,
      upiDetail:
        account.upiDetail && options.includeUpiDetail
          ? this.upiDetailToDto(account.upiDetail)
          : undefined,
    };
  }

  private static bankDetailToDto(bankDetail: BankDetail): BankDetailDto {
    return {
      bankAccountHolderName: bankDetail.bankAccountHolderName,
      bankName: bankDetail.bankName,
      bankBranch: bankDetail.bankBranch,
      bankAccountNumber: bankDetail.bankAccountNumber,
      bankAccountType: bankDetail.bankAccountType,
      IFSCNumber: bankDetail.IFSCNumber,
    };
  }

  private static upiDetailToDto(upiDetail: UPIDetail): UPIDetailDto {
    return {
      payeeName: upiDetail.payeeName,
      upiId: upiDetail.upiId,
      mobileNumber: upiDetail.mobileNumber,
      qrData: upiDetail.qrData,
    };
  }
}
