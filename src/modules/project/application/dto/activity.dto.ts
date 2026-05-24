import { IsString, IsOptional, IsNumber, IsDate, IsArray, IsEnum, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityScale, ActivityType, ActivityStatus, ActivityPriority } from '../../domain/model/activity.model';

export class CreateActivityDto {

  @IsString()
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;

  @IsEnum(ActivityScale)
  @ApiProperty({ enum: ActivityScale })
  scale: ActivityScale;

  @IsEnum(ActivityType)
  @ApiProperty({ enum: ActivityType })
  type: ActivityType;

  @IsEnum(ActivityPriority)
  @ApiProperty({ enum: ActivityPriority })
  priority: ActivityPriority;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  endDate?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  venue?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  organizerId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  parentActivityId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  expectedParticipants?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ minimum: 0.01 })
  estimatedCost?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], default: [] })
  tags?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;

  @IsOptional()
  @IsEnum(ActivityScale)
  @ApiPropertyOptional({ enum: ActivityScale })
  scale?: ActivityScale;

  @IsOptional()
  @IsEnum(ActivityType)
  @ApiPropertyOptional({ enum: ActivityType })
  type?: ActivityType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  @ApiPropertyOptional({ enum: ActivityStatus })
  status?: ActivityStatus;

  @IsOptional()
  @IsEnum(ActivityPriority)
  @ApiPropertyOptional({ enum: ActivityPriority })
  priority?: ActivityPriority;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  endDate?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  location?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  venue?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  organizerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  expectedParticipants?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ minimum: 0.01 })
  estimatedCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ minimum: 0.01 })
  actualCost?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class UpdateActivityStatusDto {
  @IsEnum(ActivityStatus)
  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;
}

export class UpdateActivityParticipantsDto {
  @IsInt()
  @Min(0)
  @ApiProperty({ minimum: 0 })
  actualParticipants: number;
}

export class LinkExpenseToActivityDto {
  @IsString()
  @ApiProperty()
  expenseId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  allocationPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ minimum: 0.01 })
  allocationAmount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notes?: string;
}

export class ActivityDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: ActivityScale })
  scale: ActivityScale;

  @ApiProperty({ enum: ActivityType })
  type: ActivityType;

  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;

  @ApiProperty({ enum: ActivityPriority })
  priority: ActivityPriority;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  endDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  actualStartDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  actualEndDate?: Date;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  venue?: string;

  @ApiPropertyOptional()
  assignedTo?: string;

  @ApiPropertyOptional()
  organizerId?: string;

  @ApiPropertyOptional()
  parentActivityId?: string;

  @ApiPropertyOptional()
  expectedParticipants?: number;

  @ApiPropertyOptional()
  actualParticipants?: number;

  @ApiPropertyOptional()
  estimatedCost?: number;

  @ApiPropertyOptional()
  actualCost?: number;

  @ApiPropertyOptional()
  currency?: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  nextStatus: ActivityStatus[]
}

export class ActivityDetailFilterDto {

  @IsOptional()
  @IsEnum(ActivityScale)
  @ApiPropertyOptional({ enum: ActivityScale })
  scale?: ActivityScale;

  @IsOptional()
  @IsEnum(ActivityStatus)
  @ApiPropertyOptional({ enum: ActivityStatus })
  status?: ActivityStatus;

  @IsOptional()
  @IsEnum(ActivityType)
  @ApiPropertyOptional({ enum: ActivityType })
  type?: ActivityType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  organizerId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  parentActivityId?: string;
}

