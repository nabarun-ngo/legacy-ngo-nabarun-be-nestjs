import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
IsArray,
IsBoolean,
IsEnum,
IsNumber,
IsObject,
IsString,
} from "class-validator";

export class CronJobDto {
  @ApiProperty()
  @IsString()
  name: string;
  @ApiProperty()
  @IsString()
  description: string;
  @ApiProperty()
  @IsString()
  handler: string; // method name in service
  @ApiProperty()
  @IsString()
  expression: string;
  @ApiProperty()
  @IsString()
  readableExpression: string;
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
  @ApiProperty()
  @Type(() => Date)
  nextRun: Date;
  @ApiProperty()
  @IsObject()
  @Type(() => Object)
  inputData?: any;
}

export class QueueDto {
  @ApiProperty()
  @IsString()
  id?: string;
  @ApiProperty()
  @IsString()
  jobName: string;
  @ApiProperty()
  @IsString()
  remarks?: string;
}

export class SchedulerLogDto {
  @ApiProperty()
  @IsString()
  triggerId?: string;
  @ApiProperty()
  @Type(() => Date)
  triggerAt: Date;
  @ApiProperty()
  @IsArray()
  executedJobs: QueueDto[];
  @ApiProperty()
  @IsArray()
  skippedJobs: QueueDto[];
}

export class CronExecutionDto {
  @ApiProperty()
  @IsString()
  id: string;
  @ApiProperty()
  @IsString()
  jobName: string;
  @ApiProperty()
  @Type(() => Date)
  executedAt: Date;
  @ApiProperty()
  @IsNumber()
  duration: number;
  @ApiProperty()
  @IsEnum(["AUTOMATIC", "MANUAL"])
  trigger: "AUTOMATIC" | "MANUAL";
  @ApiProperty()
  @IsEnum(["SUCCESS", "FAILED", "TRIGGERED"])
  status: "SUCCESS" | "FAILED" | "TRIGGERED";
  @ApiProperty()
  @IsString()
  error?: string;
  @ApiProperty()
  @IsObject()
  result?: any;
  @ApiProperty()
  @IsArray()
  executionLogs: string[];
}
