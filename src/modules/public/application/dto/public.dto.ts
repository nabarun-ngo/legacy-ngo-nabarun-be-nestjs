import { ApiProperty } from "@nestjs/swagger";
import { IsDefined,IsNotEmpty,IsNumber,IsString } from "class-validator";

export class SignUpDto {
  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  hometown: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  howDoUKnowAboutUs: string;
}

export class ContactFormDto {
  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class DonationFormDto {
  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @ApiProperty({ required: true })
  @IsDefined()
  @IsNumber()
  amount: number;
}

export interface TeamMember {
  socialLinks: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  id: string;
  fullName: string;
  picture: string;
  roleString: string;
  email: string;
  bio?: string;
}
