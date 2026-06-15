import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional,IsString } from "class-validator";

export class SendEmailDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  from?: string;
  @ApiProperty()
  @IsString()
  to: string;
  @ApiProperty()
  @IsString()
  subject: string;
  @ApiProperty()
  @IsString()
  html: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cc?: string | string[];
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bcc?: string | string[];
}
