import { Body,Controller,Get,Param,Post,Put,Query } from "@nestjs/common";
import { ApiBearerAuth,ApiSecurity,ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/modules/shared/auth/application/decorators/current-user.decorator";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";
import { type AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import { ApiAutoResponse } from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import {
CreateMeetingDto,
MeetingDto,
UpdateEventDto,
} from "../../application/dto/meetings.dto";
import { MeetingService } from "../../application/service/meeting.service";

@ApiTags(MeetingController.name)
@ApiBearerAuth("jwt")
@Controller("meetings")
@ApiSecurity("api-key")
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post("create")
  @RequirePermissions("create:meeting")
  @ApiAutoResponse(MeetingDto, {
    description: "Meeting created successfully",
    wrapInSuccessResponse: true,
  })
  async createMeeting(
    @Body() eventData: CreateMeetingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return new SuccessResponse(
      await this.meetingService.createMeeting(eventData, user.profile_id),
    );
  }

  @Get("list")
  @RequirePermissions("read:meeting")
  @ApiAutoResponse(MeetingDto, {
    description: "Meetings fetched successfully",
    wrapInSuccessResponse: true,
  })
  async listMeetings(
    @CurrentUser() user: AuthUser,
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return new SuccessResponse(
      await this.meetingService.list({ pageIndex, pageSize }, user),
    );
  }

  @Put("update/:id")
  @RequirePermissions("update:meeting")
  @ApiAutoResponse(MeetingDto, {
    description: "Meeting updated successfully",
    wrapInSuccessResponse: true,
  })
  async updateMeeting(
    @Param("id") eventId: string,
    @Body() updateData: UpdateEventDto,
  ) {
    return new SuccessResponse(
      await this.meetingService.updateMeeting(eventId, updateData),
    );
  }
}
