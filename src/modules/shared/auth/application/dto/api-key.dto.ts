import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import {
ArrayNotEmpty,
IsArray,
IsDate,
IsOptional,
IsString,
} from "class-validator";

export class CreateApiKeyDto {
  @IsString()
  @ApiProperty()
  name: string;

  @ArrayNotEmpty()
  @ApiProperty()
  permissions: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDate()
  expireAt?: Date;
}

export class ApiKeyDto {
  @IsString()
  @ApiProperty()
  id: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  apiToken?: string;

  @IsString()
  @ApiProperty()
  name: string;

  @IsArray()
  @ApiProperty()
  permissions: string[];

  @IsDate()
  @ApiProperty()
  expiresAt?: Date;

  @IsDate()
  @ApiProperty()
  lastUsedAt?: Date;

  @IsDate()
  @ApiProperty()
  createdAt?: Date;

  @IsDate()
  @ApiProperty()
  updatedAt?: Date;
}
