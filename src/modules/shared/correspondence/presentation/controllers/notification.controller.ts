import {
Body,
Controller,
Delete,
Get,
HttpCode,
HttpStatus,
Param,
Patch,
Post,
Query,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiQuery,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/modules/shared/auth/application/decorators/current-user.decorator";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";
import type { AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
ApiAutoVoidResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import { NotificationService } from "../../application/services/notification.service";
import {
BulkNotificationDto,
FcmTokenFilterDto,
NotificationFiltersDto,
NotificationResponseDto,
RegisterFcmTokenDto,
UserFcmTokensDto,
} from "../dtos/notification.dto";

@ApiTags(NotificationController.name)
@ApiBearerAuth("jwt")
@Controller("notifications")
@ApiSecurity("api-key")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post("bulk")
  @ApiOperation({ summary: "Create bulk notifications" })
  @RequirePermissions("create:notification")
  @ApiAutoResponse(NotificationResponseDto, {
    status: 201,
    description: "Bulk notifications created successfully",
    wrapInSuccessResponse: true,
  })
  async createBulkNotifications(@Body() dto: BulkNotificationDto) {
    const notifications =
      await this.notificationService.createBulkNotifications(dto);
    return new SuccessResponse(notifications);
  }

  @Get("me")
  @ApiOperation({ summary: "Get my notifications" })
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(NotificationResponseDto, {
    status: 200,
    description: "Notifications retrieved successfully",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getMyNotifications(
    @CurrentUser() user: AuthUser,
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: NotificationFiltersDto,
  ) {
    const userId = user.profile_id!;
    const result = await this.notificationService.getUserNotifications(userId, {
      pageIndex,
      pageSize,
      props: filter,
    });

    return new SuccessResponse(result);
  }

  @Get("me/unread-count")
  @ApiOperation({ summary: "Get my unread notification count" })
  @ApiAutoResponse(Number, {
    status: 200,
    description: "Unread count retrieved successfully",
    wrapInSuccessResponse: true,
  })
  async getMyUnreadCount(@CurrentUser() user: AuthUser) {
    const userId = user.profile_id!;
    const count = await this.notificationService.getUnreadCount(userId);
    return new SuccessResponse(count ?? 0);
  }

  @Patch("me/update-as-read/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiAutoVoidResponse({
    status: 200,
    description: "Notification marked as read",
  })
  async markAsRead(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    await this.notificationService.markAsRead(user.profile_id!, id);
    return new SuccessResponse();
  }

  @Patch("me/update-as-read-all")
  @ApiOperation({ summary: "Mark all my notifications as read" })
  @ApiAutoVoidResponse({
    status: 200,
    description: "All notifications marked as read",
  })
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    const userId = user.profile_id!;
    await this.notificationService.markAllAsRead(userId);
    return new SuccessResponse();
  }

  @Patch("me/update-as-archive/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive notification" })
  @ApiAutoVoidResponse({ status: 200, description: "Notification archived" })
  async archiveNotification(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.notificationService.archiveNotification(user.profile_id!, id);
    return new SuccessResponse();
  }

  @Post("fcm-token")
  @ApiOperation({ summary: "Register FCM token for push notifications" })
  @ApiAutoResponse(String, {
    status: 200,
    description: "FCM token registered successfully",
  })
  async registerFcmToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterFcmTokenDto,
  ) {
    const userId = user.profile_id!;
    await this.notificationService.registerFcmToken(userId, dto);
    return new SuccessResponse("FCM token registered successfully");
  }

  @Delete("fcm-token/:tokenId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete FCM token" })
  @ApiAutoVoidResponse({ status: 200, description: "FCM token deleted" })
  async deleteFcmToken(@Param("tokenId") tokenId: string) {
    await this.notificationService.deleteFcmToken(tokenId);
    return new SuccessResponse();
  }

  @Get("fcm-tokens/metadata")
  @ApiOperation({ summary: "Get all FCM token metadata (grouped by user)" })
  @RequirePermissions("read:fcm_tokens")
  @ApiAutoPagedResponse(UserFcmTokensDto, {
    status: 200,
    description: "FCM token metadata retrieved successfully",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getFcmTokensMetadata(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: FcmTokenFilterDto,
  ) {
    const result = await this.notificationService.getFcmTokensMetadata({
      pageIndex,
      pageSize,
      props: filter,
    });

    return new SuccessResponse(result);
  }

  @Get()
  @ApiOperation({ summary: "Get push notifications" })
  @RequirePermissions("read:notifications")
  @ApiAutoPagedResponse(NotificationResponseDto, {
    status: 200,
    description: "Push notifications retrieved successfully",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getNotifications(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: NotificationFiltersDto,
  ) {
    const result = await this.notificationService.getNotifications({
      pageIndex,
      pageSize,
      props: filter,
    });

    return new SuccessResponse(result);
  }

  @Post("resend/:id")
  @ApiOperation({ summary: "Resend a push notification" })
  @RequirePermissions("create:notification")
  @ApiAutoVoidResponse({
    status: 200,
    description: "Push notification resent successfully",
  })
  async resendPushNotification(@Param("id") id: string) {
    await this.notificationService.resendPushNotification(id);
    return new SuccessResponse("Push notification resent successfully");
  }
}
