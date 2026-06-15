import {
Body,
Controller,
Delete,
Get,
Param,
Post,
Query,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiBody,
ApiOperation,
ApiParam,
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
} from "src/shared/decorators/api-auto-response.decorator";
import { PagedResult } from "src/shared/models/paged-result";
import { SuccessResponse } from "src/shared/models/response-model";
import { FieldAttributeDto } from "src/shared/utilities/additional-field.util";
import {
ReportCategoryDto,
ReportDetailDto,
ReportFilterDto,
UpdateReportDto,
} from "../../application/dto/report.dto";
import { ReportingService } from "../../application/services/reporting.service";

@ApiTags(ReportingController.name)
@Controller("report")
@ApiBearerAuth("jwt")
@ApiSecurity("api-key")
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * GET /reporting/registered-reports
   * Returns the list of all registered report providers.
   */
  @Get("registered-reports")
  @RequirePermissions("read:reports")
  @ApiOperation({ summary: "Get list of reports that can be generated" })
  @ApiAutoResponse(ReportCategoryDto, {
    isArray: true,
    description: "List of reports that can be generated",
    wrapInSuccessResponse: true,
  })
  async getRegisteredReports(): Promise<SuccessResponse<ReportCategoryDto[]>> {
    const providers = await this.reportingService.registeredReports();
    return new SuccessResponse(providers);
  }

  /**
   * POST /reporting/trigger/:reportCode
   * Triggers a report generation for the given report code.
   * Uploads the result to DMS and sends email notifications.
   */
  @Post("generate/:reportCode")
  //@RequirePermissions('create:report')
  @ApiOperation({ summary: "generate a report" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: true,
    },
    description: "The parameters for the report generation.",
  })
  @ApiParam({
    name: "reportCode",
    description: "The unique code of the report to generate",
    type: String,
  })
  @ApiAutoResponse(ReportDetailDto, {
    description: "Report generated successfully",
    wrapInSuccessResponse: true,
  })
  async generateReport(
    @Param("reportCode") reportCode: string,
    @Body() params: any,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.reportingService.generateReport(
      reportCode,
      params,
      user,
    );
    return new SuccessResponse(result);
  }

  /**
   * GET /report/list/:reportCode
   * Returns a paginated list of report executions for the given report code.
   */
  @Get("list/:reportCode")
  @RequirePermissions("read:reports")
  @ApiOperation({ summary: "List report executions for a specific report" })
  @ApiParam({
    name: "reportCode",
    description: "The unique code of the report",
  })
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(ReportDetailDto, {
    description: "Paginated list of report executions",
    wrapInSuccessResponse: true,
  })
  async listReports(
    @Param("reportCode") reportCode: string,
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: ReportFilterDto,
  ): Promise<SuccessResponse<PagedResult<ReportDetailDto>>> {
    const result = await this.reportingService.findReports(
      reportCode,
      filter,
      pageIndex,
      pageSize,
    );

    return new SuccessResponse(result);
  }

  /**
   * POST /report/:reportId/status
   * Updates status of a specific report.
   */
  @Post(":reportId/updateStatus")
  @ApiOperation({ summary: "Update report status" })
  @ApiParam({ name: "reportId", description: "The ID of the report" })
  @ApiBody({ type: UpdateReportDto })
  @ApiAutoResponse(ReportDetailDto, {
    description: "Report status updated successfully",
    wrapInSuccessResponse: true,
  })
  async updateStatus(
    @Param("reportId") reportId: string,
    @Body() body: UpdateReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.reportingService.updateStatus(
      reportId,
      body.status,
      user.profile_id!,
      user.user_roles || [],
    );
    return new SuccessResponse(result);
  }

  /**
   * DELETE /report/:reportId
   * Deletes a specific report.
   */
  @Delete(":reportId")
  @ApiOperation({ summary: "Delete a report" })
  @ApiParam({ name: "reportId", description: "The ID of the report to delete" })
  @ApiAutoResponse(String, {
    description: "Report deleted successfully",
    wrapInSuccessResponse: true,
  })
  async deleteReport(@Param("reportId") reportId: string) {
    await this.reportingService.deleteReport(reportId);
    return new SuccessResponse("Report deleted successfully");
  }

  /**
   * POST /report/:reportId/regenerate
   * Regenerates a specific report.
   */
  @Post(":reportId/regenerate")
  @ApiOperation({ summary: "Regenerate a report" })
  @ApiParam({
    name: "reportId",
    description: "The ID of the report to regenerate",
  })
  @ApiAutoResponse(String, {
    description: "Report regenerated successfully",
    wrapInSuccessResponse: true,
  })
  async regenerateReport(
    @Param("reportId") reportId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.reportingService.regenerateReport(reportId, user);
    return new SuccessResponse(result);
  }

  @Get("static/reportInputs")
  @ApiOperation({ summary: "Get additional fields for report" })
  @ApiAutoResponse(FieldAttributeDto, {
    description: "Report inputs retrieved successfully",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  @ApiQuery({ name: "reportCode", required: true, description: "Report code" })
  async getReportInputs(
    @Query("reportCode") reportCode: string,
  ): Promise<SuccessResponse<FieldAttributeDto[]>> {
    return new SuccessResponse<FieldAttributeDto[]>(
      await this.reportingService.getReportInputFields(reportCode),
    );
  }
}
