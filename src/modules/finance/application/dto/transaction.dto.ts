import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { Transform,Type } from "class-transformer";
import {
IsDate,
IsEnum,
IsNumber,
IsOptional,
IsString,
Min,
} from "class-validator";
import {
TransactionRefType,
TransactionStatus,
TransactionType,
} from "../../domain/model/transaction.model";
import { AccountDetailDto } from "./account.dto";

/**
 * Transaction Detail DTO - matches legacy TransactionDetail
 */
export class TransactionDetailDto {
  @ApiProperty()
  @IsString()
  txnId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnNumber?: string;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  txnDate: Date;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  txnAmount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  txnType: TransactionType;

  @ApiProperty({ enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  txnStatus: TransactionStatus;

  @ApiProperty()
  @IsString()
  txnDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnParticulars?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnRefId?: string;

  @ApiPropertyOptional({ enum: TransactionRefType })
  @IsOptional()
  @IsEnum(TransactionRefType)
  txnRefType?: TransactionRefType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accTxnType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferTo?: string;

  @ApiProperty()
  @IsString()
  transactionRef: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => AccountDetailDto)
  account?: AccountDetailDto;
}

/**
 * Transaction Detail Filter DTO
 */
export class TransactionDetailFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnId?: string;

  @ApiPropertyOptional({ enum: TransactionType, isArray: true })
  @IsOptional()
  @IsEnum(TransactionType, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  txnType?: TransactionType[];

  @ApiPropertyOptional({ enum: TransactionStatus, isArray: true })
  @IsOptional()
  @IsEnum(TransactionStatus, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  txnStatus?: TransactionStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

/**
 * Create Transaction DTO
 */
export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  txnType: TransactionType;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  txnAmount: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty()
  @IsString()
  txnDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnParticulars?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnRefId?: string;

  @ApiPropertyOptional({ enum: TransactionRefType })
  @IsOptional()
  @IsEnum(TransactionRefType)
  txnRefType?: TransactionRefType;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  txnDate?: Date;
}

export class ReverseTransactionDto {
  @ApiProperty()
  @IsString()
  transactionRef: string;

  @ApiProperty()
  @IsString()
  comment: string;
}
