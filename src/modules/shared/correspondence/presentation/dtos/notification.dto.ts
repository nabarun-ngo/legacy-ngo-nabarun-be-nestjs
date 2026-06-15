import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import {
IsBoolean,
IsDateString,
IsEnum,
IsNotEmpty,
IsOptional,
IsString
} from "class-validator";
import {
NotificationCategory,
NotificationPriority,
NotificationType,
} from "../../domain/models/notification.model";

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiProperty({ enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiPropertyOptional()
  actionUrl?: string;

  @ApiPropertyOptional()
  actionType?: string;

  @ApiPropertyOptional()
  actionData?: Record<string, any>;

  @ApiPropertyOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  referenceType?: string;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  isArchived: boolean;

  @ApiPropertyOptional()
  archivedAt?: Date;

  @ApiProperty()
  isPushSent: boolean;

  @ApiPropertyOptional()
  pushSentAt?: Date;

  @ApiProperty()
  pushDelivered: boolean;

  @ApiPropertyOptional()
  pushError?: string;

  @ApiPropertyOptional()
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NotificationFiltersDto {
  @ApiPropertyOptional({ enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  readonly type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  @IsOptional()
  readonly category?: NotificationCategory;

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  readonly isRead?: "Y" | "N";

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  readonly isArchived?: "Y" | "N";

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly referenceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly referenceType?: string;

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  readonly isPushSent?: "Y" | "N";

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  readonly pushDelivered?: "Y" | "N";

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  readonly fromDate?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  readonly toDate?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly userId?: string;
}

export class RegisterFcmTokenDto {
  @ApiProperty({ description: "FCM token" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: "Device type (WEB, ANDROID, IOS)" })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiPropertyOptional({ description: "Device name" })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ description: "Browser name" })
  @IsString()
  @IsOptional()
  browser?: string;

  @ApiPropertyOptional({ description: "Operating system" })
  @IsString()
  @IsOptional()
  os?: string;
}

//TODO: Remove this DTO
export class BulkNotificationDto {
  @ApiProperty({
    description: "User IDs who will receive the notification",
    type: [String],
  })
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiProperty({ description: "Notification title" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: "Notification body/message" })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: NotificationType, description: "Notification type" })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    enum: NotificationCategory,
    description: "Notification category",
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    description: "Notification priority",
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: "Action URL when notification is clicked",
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({ description: "Send push notification", default: true })
  @IsBoolean()
  @IsOptional()
  sendPush?: boolean;
}

export class FcmTokenMetadataDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  deviceType?: string;

  @ApiPropertyOptional()
  deviceName?: string;

  @ApiPropertyOptional()
  browser?: string;

  @ApiPropertyOptional()
  os?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastUsedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserFcmTokensDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({ type: [FcmTokenMetadataDto] })
  tokens: FcmTokenMetadataDto[];
}

export class FcmTokenFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: "Device type (WEB, ANDROID, IOS)" })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsEnum(["Y", "N"])
  @IsOptional()
  isActive?: "Y" | "N";

  @ApiPropertyOptional({
    description: "Search string for device name, user name, or email",
  })
  @IsString()
  @IsOptional()
  search?: string;
}
