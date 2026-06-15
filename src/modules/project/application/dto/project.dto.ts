import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
IsArray,
IsDate,
IsEnum,
IsNumber,
IsOptional,
IsString,
Min,
} from "class-validator";
import { KeyValueDto } from "src/shared/dto/KeyValue.dto";
import {
ProjectCategory,
ProjectPhase,
ProjectStatus,
} from "../../domain/model/project.model";
import { UpdateActivityDto } from "./activity.dto";

export class CreateProjectDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  description: string;

  @IsString()
  @ApiProperty()
  code: string;

  @IsEnum(ProjectCategory)
  @ApiProperty({ enum: ProjectCategory })
  category: ProjectCategory;

  @IsOptional()
  @IsEnum(ProjectStatus)
  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.PLANNING })
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPhase)
  @ApiPropertyOptional({ enum: ProjectPhase, default: ProjectPhase.INITIATION })
  phase?: ProjectPhase;

  @IsDate()
  @Type(() => Date)
  @ApiProperty({ type: String, format: "date-time" })
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: "date-time" })
  endDate?: Date;

  @IsNumber()
  @Min(0.01)
  @ApiProperty({ minimum: 0.01 })
  budget: number;

  @IsString()
  @ApiProperty()
  currency: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  targetBeneficiaryCount?: number;

  @IsString()
  @ApiProperty()
  managerId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  sponsorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], default: [] })
  tags?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class UpdateProjectActivityDto extends UpdateActivityDto {
  @IsString()
  @ApiProperty()
  id: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectCategory)
  @ApiPropertyOptional({ enum: ProjectCategory })
  category?: ProjectCategory;

  @IsOptional()
  @IsEnum(ProjectStatus)
  @ApiPropertyOptional({ enum: ProjectStatus })
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPhase)
  @ApiPropertyOptional({ enum: ProjectPhase })
  phase?: ProjectPhase;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: "date-time" })
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ minimum: 0.01 })
  budget?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  targetBeneficiaryCount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  sponsorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class ProjectDetailDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ enum: ProjectCategory })
  @IsEnum(ProjectCategory)
  category: ProjectCategory;

  @ApiProperty({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiProperty({ enum: ProjectPhase })
  @IsEnum(ProjectPhase)
  phase: ProjectPhase;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  actualEndDate?: Date;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  spentAmount?: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiPropertyOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  targetBeneficiaryCount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  actualBeneficiaryCount?: number;

  @ApiProperty()
  @IsString()
  managerId: string;

  @ApiPropertyOptional()
  @IsString()
  sponsorId?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  nextStatus: ProjectStatus[];
}

export class ProjectDetailFilterDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  @ApiPropertyOptional({ enum: ProjectStatus })
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectCategory)
  @ApiPropertyOptional({ enum: ProjectCategory })
  category?: ProjectCategory;

  @IsOptional()
  @IsEnum(ProjectPhase)
  @ApiPropertyOptional({ enum: ProjectPhase })
  phase?: ProjectPhase;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  managerId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  sponsorId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  tags?: string[];
}

export class ProjectRefDataDto {
  @ApiProperty({ isArray: true })
  projectCategories: KeyValueDto[];

  @ApiProperty({ isArray: true })
  projectStatuses: KeyValueDto[];

  @ApiProperty({ isArray: true })
  projectPhases: KeyValueDto[];

  @ApiProperty({ isArray: true })
  activityScales: KeyValueDto[];

  @ApiProperty({ isArray: true })
  activityTypes: KeyValueDto[];

  @ApiProperty({ isArray: true })
  activityStatuses: KeyValueDto[];

  @ApiProperty({ isArray: true })
  activityPriorities: KeyValueDto[];
}
