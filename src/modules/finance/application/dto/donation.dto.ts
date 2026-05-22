import { IsNumber, IsString, IsOptional, Min, IsEmail, IsBoolean, IsDate, IsArray, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationType, DonationStatus, PaymentMethod, UPIPaymentType } from '../../domain/model/donation.model';
import { AccountDetailDto } from './account.dto';
import { UserDto } from 'src/modules/user/application/dto/user.dto';
import { KeyValueDto } from 'src/shared/dto/KeyValue.dto';

export class CreateDonationDto {

  @IsEnum(DonationType)
  @ApiProperty({ enum: DonationType })
  type: DonationType;


  @IsNumber()
  @Min(1)
  @ApiProperty({ minimum: 1 })
  amount: number;


  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Start date for regular donations' })
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'End date for regular donations' })
  endDate?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Required in case of ONETIME donations' })
  forEventId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Required in case of ONETIME donations' })
  donorId?: string;

}

export class CreateGuestDonationDto {
  @IsNumber()
  @Min(1)
  @ApiProperty({ minimum: 1 })
  amount: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional for guests' })
  donorNumber?: string; // Optional for internal members

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Required for guests' })
  donorName: string; // Required for guests

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ description: 'Optional for guests' })
  donorEmail?: string; // Required for guests

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Required in case of ONETIME donations' })
  forEventId?: string;
}

export class ProcessDonationPaymentDto {
  @IsString()
  @ApiProperty()
  donationId: string;

  @IsString()
  @ApiProperty()
  accountId: AccountDetailDto;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  transactionRef?: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @ApiPropertyOptional({ enum: UPIPaymentType })
  paidUsingUPI?: UPIPaymentType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  confirmedBy?: UserDto;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isPaymentNotified?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  remarks?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  paidOn?: Date;
}

export class DonationDetailFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  donorId?: string;

  @ApiPropertyOptional({ enum: DonationStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  status?: DonationStatus[];

  @ApiPropertyOptional({ enum: DonationType, isArray: true })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined
  )
  type?: DonationType[];

  @ApiPropertyOptional({ enum: ['Y', 'N'] })
  @IsOptional()
  @IsEnum(['Y', 'N'])
  isGuest?: 'Y' | 'N';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  donationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  donorName?: string;

}

export class DownloadDonationSummaryDto {
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

export class DonationDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ description: 'Whether this is a guest donation' })
  isGuest: boolean;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  donorId: string;

  @ApiProperty()
  donorName: string;

  @ApiPropertyOptional()
  donorEmail?: string;

  @ApiPropertyOptional()
  donorNumber?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Start date for regular donations' })
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'End date for regular donations' })
  endDate?: Date;

  @ApiProperty({ type: String, format: 'date-time', description: 'Date when donation was raised' })
  raisedOn: Date;

  @ApiProperty({ enum: DonationType, description: 'Donation type: REGULAR or ONETIME' })
  type: DonationType;

  @ApiProperty({ enum: DonationStatus })
  status: DonationStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Date when donation was paid' })
  paidOn?: Date;

  @ApiPropertyOptional({ description: 'User ID who confirmed the donation' })
  confirmedBy?: UserDto;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Date when donation was confirmed' })
  confirmedOn?: Date;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Payment method used' })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Account ID where payment was made' })
  paidToAccount?: AccountDetailDto;

  @ApiPropertyOptional({ description: 'Event ID this donation is for' })
  forEvent?: string; // EventDetail reference

  @ApiPropertyOptional({ enum: UPIPaymentType, description: 'UPI payment type if payment method is UPI' })
  paidUsingUPI?: UPIPaymentType;

  @ApiPropertyOptional({ description: 'Whether payment notification was sent' })
  isPaymentNotified?: boolean;

  @ApiPropertyOptional({ description: 'Transaction reference ID' })
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Additional remarks' })
  remarks?: string;

  @ApiPropertyOptional({ description: 'Reason for cancellation (legacy typo preserved)' })
  cancelletionReason?: string;

  @ApiPropertyOptional({ description: 'Reason for later payment' })
  laterPaymentReason?: string;

  @ApiPropertyOptional({ description: 'Payment failure details' })
  paymentFailureDetail?: string;

  @ApiProperty({ description: 'Next possible statuses for this donation', isArray: true, enum: DonationStatus })
  @IsArray()
  @IsEnum(DonationStatus, { each: true })
  nextStatuses: DonationStatus[];

  @ApiPropertyOptional({ description: 'Activity ID this donation is for' })
  activityId?: string;

  @ApiPropertyOptional({ description: 'Activity name this donation is for' })
  activityName?: string;

}

export class UpdateDonationDto {
  @IsOptional()
  @IsEnum(DonationStatus)
  @ApiPropertyOptional({ enum: DonationStatus })
  status?: DonationStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @ApiPropertyOptional({ enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(UPIPaymentType)
  @ApiPropertyOptional({ enum: UPIPaymentType })
  paidUsingUPI?: UPIPaymentType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Additional remarks' })
  remarks?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ description: 'Amount', minimum: 1 })
  amount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Event ID this donation is for' })
  forEvent?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Account ID where payment was made' })
  paidToAccountId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  transactionRef?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isPaymentNotified?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  paidOn?: Date;

}


export class DonationSummaryDto {
  @ApiProperty()
  @IsBoolean()
  hasOutstanding: boolean;

  @ApiProperty()
  @IsArray()
  outstandingMonths: string[];

  @ApiProperty()
  @IsNumber()
  outstandingAmount: number;
}


export class DonationRefDataDto {
  @ApiProperty()
  donationStatuses?: KeyValueDto[];

  @ApiProperty()
  donationTypes?: KeyValueDto[];

  @ApiProperty()
  paymentMethods?: KeyValueDto[];

  @ApiProperty()
  upiOptions?: KeyValueDto[];

}

