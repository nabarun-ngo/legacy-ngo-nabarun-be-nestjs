import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
IsArray,
IsBoolean,
IsDateString,
IsOptional,
IsString,
ValidateNested
} from "class-validator";

export class SpeakerDto {
  @ApiProperty()
  @IsString()
  display_name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  matched_calendar_invitee_email?: string;
}

export class TranscriptDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => SpeakerDto)
  speaker: SpeakerDto;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsString()
  timestamp: string;
}

export class DefaultSummaryDto {
  @ApiProperty()
  @IsString()
  template_name: string;

  @ApiProperty()
  @IsString()
  markdown_formatted: string;
}

export class AssigneeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  team?: string;
}

export class ActionItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsBoolean()
  user_generated: boolean;

  @ApiProperty()
  @IsBoolean()
  completed: boolean;

  @ApiProperty()
  @IsString()
  recording_timestamp: string;

  @ApiProperty()
  @IsString()
  recording_playback_url: string;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => AssigneeDto)
  @IsOptional()
  assignee?: AssigneeDto;
}

export class CalendarInviteeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  matched_speaker_display_name?: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsBoolean()
  is_external: boolean;

  @ApiProperty()
  @IsString()
  email_domain: string;
}

export class RecordedByDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  team?: string;

  @ApiProperty()
  @IsString()
  email_domain: string;
}

export class CrmMatchesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  contacts?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  companies?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  deals?: any[];
}

export class FathomWebhookDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  meeting_title?: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsString()
  share_url: string;

  @ApiProperty()
  @IsDateString()
  created_at: string;

  @ApiProperty()
  @IsDateString()
  scheduled_start_time: string;

  @ApiProperty()
  @IsDateString()
  scheduled_end_time: string;

  @ApiProperty()
  @IsDateString()
  recording_start_time: string;

  @ApiProperty()
  @IsDateString()
  recording_end_time: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  calendar_invitees_domains_type?: string;

  @ApiProperty({ type: [TranscriptDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptDto)
  @IsOptional()
  transcript?: TranscriptDto[];

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => DefaultSummaryDto)
  @IsOptional()
  default_summary?: DefaultSummaryDto;

  @ApiProperty({ type: [ActionItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionItemDto)
  @IsOptional()
  action_items?: ActionItemDto[];

  @ApiProperty({ type: [CalendarInviteeDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarInviteeDto)
  @IsOptional()
  calendar_invitees?: CalendarInviteeDto[];

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => RecordedByDto)
  @IsOptional()
  recorded_by?: RecordedByDto;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => CrmMatchesDto)
  @IsOptional()
  crm_matches?: CrmMatchesDto;
}
