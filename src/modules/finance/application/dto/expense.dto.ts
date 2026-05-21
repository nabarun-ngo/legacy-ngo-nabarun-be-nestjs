import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, IsDate, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ExpenseRefType, ExpenseStatus } from '../../domain/model/expense.model';
import { UserDto } from 'src/modules/user/application/dto/user.dto';


/**
 * Expense Item Detail DTO
 */
export class ExpenseItemDetailDto {
  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;
}

/**
 * Expense Detail DTO - matches legacy ExpenseDetail
 */
export class ExpenseDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expenseDate: Date;

  @ApiPropertyOptional()
  createdBy?: UserDto; // UserDetail reference

  @ApiProperty({ type: String, format: 'date-time' })
  createdOn: Date;

  @ApiPropertyOptional()
  isDeligated?: boolean;

  @ApiPropertyOptional()
  paidBy?: UserDto; // UserDetail reference

  @ApiPropertyOptional()
  finalizedBy?: UserDto; // UserDetail reference

  @ApiProperty({ enum: ExpenseStatus })
  status: ExpenseStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  finalizedOn?: Date;

  @ApiPropertyOptional()
  settledBy?: UserDto; // UserDetail reference

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  settledOn?: Date;

  @ApiPropertyOptional({ type: () => [ExpenseItemDetailDto] })
  expenseItems?: ExpenseItemDetailDto[];

  @ApiProperty()
  finalAmount: number;

  @ApiPropertyOptional({ enum: ExpenseRefType })
  expenseRefType?: ExpenseRefType;

  @ApiPropertyOptional()
  expenseRefId?: string;

  @ApiPropertyOptional()
  txnNumber?: string;

  @ApiPropertyOptional()
  activityName?: string;

  @ApiPropertyOptional()
  activityId?: string;

  @ApiPropertyOptional()
  settlementAccountId?: string;

  @ApiPropertyOptional()
  rejectedBy?: UserDto; // UserDetail reference

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  rejectedOn?: Date;

  @ApiPropertyOptional()
  remarks?: string;
}

/**
 * Expense Detail Filter DTO
 */
export class ExpenseDetailFilterDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseRefId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseId?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ExpenseStatus, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  expenseStatus?: ExpenseStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerId?: string;
}

/**
 * Create Expense DTO
 */
export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expenseDate?: Date;

  @ApiProperty({ enum: ExpenseRefType })
  @IsEnum(ExpenseRefType)
  expenseRefType: ExpenseRefType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseRefId?: string;

  @ApiPropertyOptional({ type: () => [ExpenseItemDetailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDetailDto)
  expenseItems?: ExpenseItemDetailDto[];

  @ApiProperty()
  @IsString()
  payerId: string;
}

/**
 * Update Expense DTO
 */
export class UpdateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expenseDate?: Date;

  @ApiPropertyOptional({ type: () => [ExpenseItemDetailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDetailDto)
  expenseItems?: ExpenseItemDetailDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerId?: string;
}
