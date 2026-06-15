import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate,IsEnum,IsOptional } from "class-validator";

export class ReportParamsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  uploadFile?: "Y" | "N";

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  sendEmail?: "Y" | "N";

  @ApiPropertyOptional({ enum: ["paidOn", "confirmedOn"] })
  @IsEnum(["paidOn", "confirmedOn"])
  @IsOptional()
  on?: "paidOn" | "confirmedOn";
}
