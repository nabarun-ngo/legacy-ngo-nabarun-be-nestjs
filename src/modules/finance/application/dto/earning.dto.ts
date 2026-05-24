import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsDate, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EarningCategory, EarningStatus } from '../../domain/model/earning.model';
import { KeyValueDto } from 'src/shared/dto/KeyValue.dto';

/**
 * Earning Detail DTO
 */
export class EarningDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: EarningCategory })
  category: EarningCategory;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: EarningStatus })
  status: EarningStatus;

  @ApiProperty()
  description: string;

  @ApiProperty()
  source: string;

  @ApiPropertyOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  referenceType?: string;

  @ApiPropertyOptional()
  accountId?: string;

  @ApiPropertyOptional()
  transactionId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  earningDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  receivedDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  createdAt?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  updatedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;
}

/**
 * Earning Detail Filter DTO
 */
export class EarningDetailFilterDto {
  @ApiPropertyOptional({ enum: EarningStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  status?: EarningStatus[];

  @ApiPropertyOptional({ enum: EarningCategory, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  category?: EarningCategory[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

/**
 * Create Earning DTO
 */
export class CreateEarningDto {
  @ApiProperty({ enum: EarningCategory })
  @IsEnum(EarningCategory)
  category: EarningCategory;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  source: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;

}

/**
 * Update Earning DTO
 */
export class UpdateEarningDto {
  @ApiPropertyOptional({ enum: EarningCategory })
  @IsOptional()
  @IsEnum(EarningCategory)
  category?: EarningCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  earningDate?: Date;

  @ApiPropertyOptional({ enum: EarningStatus })
  @IsOptional()
  @IsEnum(EarningStatus)
  status?: EarningStatus;


  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;
}

export class EarningRefDataDto {
  @ApiProperty()
  earningStatuses?: KeyValueDto[];

  @ApiProperty()
  earningCategories?: KeyValueDto[];
}