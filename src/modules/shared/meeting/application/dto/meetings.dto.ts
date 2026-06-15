import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
IsBoolean,
IsEnum,
IsNotEmpty,
IsOptional,
IsString,
ValidateNested
} from "class-validator";
import { MeetingType } from "../../domain/model/meeting.model";

export class MeetingParticipantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  attended?: string;
}

export class AgendaItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agenda: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  outcomes?: string;
}

export class CreateMeetingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty()
  @IsEnum(MeetingType)
  @IsNotEmpty()
  type: MeetingType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  @IsOptional()
  agenda?: AgendaItemDto[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ type: [MeetingParticipantDto] })
  @ValidateNested({ each: true })
  @Type(() => MeetingParticipantDto)
  attendees: MeetingParticipantDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  @IsOptional()
  agenda?: AgendaItemDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  outcomes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ type: [MeetingParticipantDto] })
  @ValidateNested({ each: true })
  @Type(() => MeetingParticipantDto)
  attendees?: MeetingParticipantDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  cancelEvent?: boolean = false;
}

export class MeetingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: MeetingType;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  agenda?: AgendaItemDto[];

  @ApiPropertyOptional()
  outcomes?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiPropertyOptional({ type: [MeetingParticipantDto] })
  attendees?: MeetingParticipantDto[];

  @ApiPropertyOptional()
  meetLink?: string;

  @ApiProperty()
  calendarLink: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  hostEmail?: string;
}
