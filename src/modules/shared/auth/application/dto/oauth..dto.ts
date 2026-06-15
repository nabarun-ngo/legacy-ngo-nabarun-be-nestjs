import { ApiProperty } from "@nestjs/swagger";
import {
IsArray,
IsDate,
IsString,
MaxLength,
MinLength,
} from "class-validator";

export class AuthCallbackDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @ApiProperty({
    description: "OAuth authorization code from Google",
    minLength: 10,
    maxLength: 500,
  })
  code: string;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  @ApiProperty({
    description:
      "State parameter for CSRF protection (returned from auth-url endpoint)",
    minLength: 10,
    maxLength: 200,
  })
  state: string;
}

export class AuthTokenDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsDate()
  expiresAt?: Date;

  @ApiProperty()
  @IsArray()
  scope?: string[];

  @ApiProperty()
  @IsDate()
  createdAt?: Date;

  @ApiProperty()
  @IsDate()
  updatedAt?: Date;
}
