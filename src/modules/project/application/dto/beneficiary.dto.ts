import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
IsArray,
IsDate,
IsEmail,
IsEnum,
IsInt,
IsOptional,
IsString,
Min,
} from "class-validator";
import {
BeneficiaryGender,
BeneficiaryStatus,
BeneficiaryType,
} from "../../domain/model/beneficiary.model";

export class CreateBeneficiaryDto {
  @IsString()
  @ApiProperty()
  projectId: string;

  @IsString()
  @ApiProperty()
  name: string;

  @IsEnum(BeneficiaryType)
  @ApiProperty({ enum: BeneficiaryType })
  type: BeneficiaryType;

  @IsOptional()
  @IsEnum(BeneficiaryGender)
  @ApiPropertyOptional({ enum: BeneficiaryGender })
  gender?: BeneficiaryGender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  age?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: "date-time" })
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  address?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  category?: string;

  @IsDate()
  @Type(() => Date)
  @ApiProperty({ type: String, format: "date-time" })
  enrollmentDate: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], default: [] })
  benefitsReceived?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class UpdateBeneficiaryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsEnum(BeneficiaryGender)
  @ApiPropertyOptional({ enum: BeneficiaryGender })
  gender?: BeneficiaryGender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  age?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: "date-time" })
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  address?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  benefitsReceived?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class UpdateBeneficiaryStatusDto {
  @IsEnum(BeneficiaryStatus)
  @ApiProperty({ enum: BeneficiaryStatus })
  status: BeneficiaryStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: "date-time" })
  exitDate?: Date;
}

export class BeneficiaryDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: BeneficiaryType })
  type: BeneficiaryType;

  @ApiPropertyOptional({ enum: BeneficiaryGender })
  gender?: BeneficiaryGender;

  @ApiPropertyOptional()
  age?: number;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  dateOfBirth?: Date;

  @ApiPropertyOptional()
  contactNumber?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty({ type: String, format: "date-time" })
  enrollmentDate: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  exitDate?: Date;

  @ApiProperty({ enum: BeneficiaryStatus })
  status: BeneficiaryStatus;

  @ApiProperty({ type: [String] })
  benefitsReceived: string[];

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class BeneficiaryDetailFilterDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  projectId?: string;

  @IsOptional()
  @IsEnum(BeneficiaryStatus)
  @ApiPropertyOptional({ enum: BeneficiaryStatus })
  status?: BeneficiaryStatus;

  @IsOptional()
  @IsEnum(BeneficiaryType)
  @ApiPropertyOptional({ enum: BeneficiaryType })
  type?: BeneficiaryType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  category?: string;
}
