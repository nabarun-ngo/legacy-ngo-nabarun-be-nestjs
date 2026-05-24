import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, ValidateNested, IsDate, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AccountStatus, AccountType } from '../../domain/model/account.model';
import { KeyValueDto } from 'src/shared/dto/KeyValue.dto';

/**
 * Bank Detail DTO - matches legacy system
 */
export class BankDetailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  IFSCNumber?: string;
}

/**
 * UPI Detail DTO - matches legacy system
 */
export class UPIDetailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payeeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  upiId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrData?: string;
}

/**
 * Account Detail DTO - matches legacy AccountDetail
 */
export class AccountDetailDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  accountHolderName?: string;

  @ApiPropertyOptional()
  accountHolder?: string; // UserDetail reference

  @ApiPropertyOptional()
  balance?: number;

  @ApiProperty({ enum: AccountStatus })
  accountStatus: AccountStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  activatedOn?: Date;

  @ApiProperty({ enum: AccountType })
  accountType: AccountType;

  @ApiPropertyOptional({ type: BankDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailDto)
  bankDetail?: BankDetailDto;

  @ApiPropertyOptional({ type: UPIDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UPIDetailDto)
  upiDetail?: UPIDetailDto;
}

/**
 * Account Detail Filter DTO
 */
export class AccountDetailFilterDto {
  @ApiPropertyOptional({ enum: AccountStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  status?: AccountStatus[];

  @ApiPropertyOptional({ enum: AccountType, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  type?: AccountType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ enum: ['Y', 'N'] })
  @IsOptional()
  @IsEnum(['Y', 'N'])
  includePaymentDetail?: 'Y' | 'N';

  @ApiPropertyOptional({ enum: ['Y', 'N'] })
  @IsOptional()
  @IsEnum(['Y', 'N'])
  includeBalance?: 'Y' | 'N';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;
}

/**
 * Create Account DTO
 */
export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderId: string;
}




/**
 * Update Account DTO
 */
export class UpdateAccountSelfDto {

  @ApiPropertyOptional({ type: BankDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailDto)
  bankDetail?: BankDetailDto;

  @ApiPropertyOptional({ type: UPIDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UPIDetailDto)
  upiDetail?: UPIDetailDto;
}

/**
 * Update Account DTO
 */
export class UpdateAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional({ type: BankDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailDto)
  bankDetail?: BankDetailDto;

  @ApiPropertyOptional({ type: UPIDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UPIDetailDto)
  upiDetail?: UPIDetailDto;
}


export class TransferDto {
  @ApiProperty()
  @IsString()
  toAccountId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDate()
  transferDate: Date;

}

export class AccountRefDataDto {
  @ApiProperty()
  accountStatuses?: KeyValueDto[];

  @ApiProperty()
  accountTypes?: KeyValueDto[];

  @ApiProperty()
  transactionRefTypes?: KeyValueDto[];

}

export class AddFundDto {

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDate()
  transferDate: Date;

}

export class FixTransactionDto {
  @ApiProperty()
  @IsArray()
  itemIds: string[];

  @ApiProperty({ enum: ['EXPENSE', 'DONATION'] })
  @IsEnum(['EXPENSE', 'DONATION'])
  itemType: 'EXPENSE' | 'DONATION';

  @ApiProperty()
  @IsString()
  newAccountId: string;
}



