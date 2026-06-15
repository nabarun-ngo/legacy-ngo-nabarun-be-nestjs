import {
Body,
Controller,
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
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "src/modules/shared/auth/application/decorators/current-user.decorator";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";
import { type AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { PagedResult } from "src/shared/models/paged-result";
import { SuccessResponse } from "src/shared/models/response-model";
import {
CreateDonationDto,
CreateGuestDonationDto,
DonationDetailFilterDto,
DonationDto,
DonationRefDataDto,
DonationSummaryDto,
ProcessDonationPaymentDto,
UpdateDonationDto,
} from "../../application/dto/donation.dto";
import { DonationService } from "../../application/services/donation.service";

/**
 * Donation Controller - matches legacy endpoints
 * Base path: /api/donation
 */
@ApiTags(DonationController.name)
@Controller("donation")
@ApiBearerAuth("jwt") // Matches the 'jwt' security definition from main.ts
@ApiSecurity("api-key")
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("create:donation")
  @ApiOperation({ summary: "Create new donation" })
  @ApiAutoResponse(DonationDto, { status: 201, description: "Created" })
  async createDonation(
    @Body() dto: CreateDonationDto,
  ): Promise<SuccessResponse<DonationDto>> {
    const donation = await this.donationService.create(dto);
    return new SuccessResponse(donation);
  }

  @Post("create/guest")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("create:donation_guest")
  @ApiOperation({ summary: "Create new guest donation" })
  @ApiAutoResponse(DonationDto, { status: 201, description: "Created" })
  async createGuestDonation(
    @Body() dto: CreateGuestDonationDto,
  ): Promise<SuccessResponse<DonationDto>> {
    const donation = await this.donationService.createGuest(dto);
    return new SuccessResponse(donation);
  }

  @Patch(":id/update")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("update:donation")
  @ApiOperation({ summary: "Update donation details" })
  @ApiAutoResponse(DonationDto, { status: 200, description: "OK" })
  async update(
    @Param("id") id: string,
    @Body() command: UpdateDonationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<DonationDto>> {
    const donation = await this.donationService.update(
      id,
      command,
      user.profile_id!,
    );
    return new SuccessResponse(donation);
  }

  @Post(":id/notify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Notify donation status" })
  @ApiAutoResponse(DonationDto, { status: 200, description: "OK" })
  async notify(
    @Param("id") id: string,
    @Body() dto: ProcessDonationPaymentDto,
  ): Promise<SuccessResponse<DonationDto>> {
    const donation = await this.donationService.processPayment(id, dto);
    return new SuccessResponse(donation);
  }

  @Get(":memberId/list")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("read:user_donations")
  @ApiOperation({ summary: "Get donations by donor" })
  @ApiAutoPagedResponse(DonationDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async getMemberDonations(
    @Param("memberId") memberId: string,
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: DonationDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<DonationDto>>> {
    const result = await this.donationService.list({
      pageIndex,
      pageSize,
      props: { ...filter, donorId: memberId },
    });
    return new SuccessResponse(result);
  }

  @Get(":donorId/summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get donations by donor" })
  @ApiAutoResponse(DonationSummaryDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async getDonationSummary(
    @Param("donorId") donorId: string,
  ): Promise<SuccessResponse<DonationSummaryDto>> {
    const result = await this.donationService.getSummary(donorId);
    return new SuccessResponse(result);
  }

  @Get("list/me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get own donations" })
  @ApiAutoPagedResponse(DonationDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async getSelfDonations(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: DonationDetailFilterDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<PagedResult<DonationDto>>> {
    const result = await this.donationService.list({
      pageIndex,
      pageSize,
      props: { ...filter, donorId: user?.profile_id },
    });
    return new SuccessResponse(result);
  }

  @Get("list")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("read:donations")
  @ApiOperation({ summary: "List all donations" })
  @ApiAutoPagedResponse(DonationDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async list(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: DonationDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<DonationDto>>> {
    const result = await this.donationService.list({
      pageIndex,
      pageSize,
      props: { ...filter },
    });
    return new SuccessResponse(result);
  }

  @Get("list/guest")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("read:donation_guest")
  @ApiOperation({ summary: "List guest donations" })
  @ApiAutoPagedResponse(DonationDto, {
    description: "OK",
    wrapInSuccessResponse: true,
  })
  async listGuestDonations(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: DonationDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<DonationDto>>> {
    const result = await this.donationService.list({
      pageIndex,
      pageSize,
      props: { ...filter, isGuest: "Y" },
    });
    return new SuccessResponse(result);
  }

  @Get("static/referenceData")
  @ApiOperation({ summary: "Get donation reference data" })
  @ApiAutoResponse(DonationRefDataDto, {
    wrapInSuccessResponse: true,
    description: "Donation reference data retrieved successfully",
  })
  async getReferenceData(): Promise<SuccessResponse<DonationRefDataDto>> {
    return new SuccessResponse<DonationRefDataDto>(
      await this.donationService.getReferenceData(),
    );
  }
}
