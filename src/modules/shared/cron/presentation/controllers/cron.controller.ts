import {
Body,
Controller,
Get,
Headers,
Param,
Post,
Query,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiBody,
ApiQuery,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import { RequirePermissions } from "../../../auth/application/decorators/require-permissions.decorator";
import { UseApiKey } from "../../../auth/application/decorators/use-api-key.decorator";
import { CronService } from "../../application/services/cron.service";
import { CronJobDto,SchedulerLogDto } from "../dtos/cron-job.dto";

@ApiTags(CronController.name)
@Controller("cron")
@ApiSecurity("api-key")
@ApiBearerAuth("jwt")
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Post("trigger")
  @UseApiKey()
  @RequirePermissions("update:cron")
  async executeCron(
    @Headers("x-cloudscheduler-scheduletime") scheduleTime?: string, // ISO 8601 format
  ) {
    return new SuccessResponse(
      await this.cronService.triggerScheduledJobs(scheduleTime),
    );
  }

  @Get("jobs")
  @RequirePermissions("read:cron")
  @ApiAutoResponse(CronJobDto, {
    description: "OK",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getScheduledJobs() {
    return new SuccessResponse(await this.cronService.getScheduledJobs());
  }

  @Get("trigger-logs")
  @RequirePermissions("read:cron")
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(SchedulerLogDto, {
    description: "OK",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getTriggerLogs(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return new SuccessResponse(
      await this.cronService.getGlobalCronTriggerLogs(pageIndex, pageSize),
    );
  }

  /**
   * Run a specific cron job manually
   * @param name
   * @param body
   * @returns
   */
  @Post("run/:name")
  @RequirePermissions("update:cron")
  @ApiAutoResponse(String, { description: "OK", wrapInSuccessResponse: true })
  @ApiBody({ type: Object, required: false })
  async runScheduledJob(
    @Param("name") name: string,
    @Body() body: Record<string, any>,
  ) {
    await this.cronService.runScheduledJob(name, body);
    return new SuccessResponse("Job executed successfully");
  }
}
