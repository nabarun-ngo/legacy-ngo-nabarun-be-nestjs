import {
Body,
Controller,
HttpCode,
HttpStatus,
Logger,
Post
} from "@nestjs/common";
import { ApiOperation,ApiResponse,ApiTags } from "@nestjs/swagger";
import { IgnoreCaptchaValidation } from "src/modules/shared/auth/application/decorators/ignore-captcha.decorator";
import { Public } from "src/modules/shared/auth/application/decorators/public.decorator";
import { JobProcessingService } from "src/modules/shared/job-processing/infrastructure/services/job-processing.service";
import { JobName } from "src/shared/job-names";
import { FathomWebhookDto } from "../../application/dto/fathom-webhook.dto";

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly jobProcessingService: JobProcessingService) {}

  @Post("fathom")
  @Public()
  @IgnoreCaptchaValidation()
  // @UseGuards(FathomWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Fathom "New meeting content ready" webhook',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Webhook received successfully",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid signature",
  })
  async handleFathomMeetingContentReady(@Body() payload: FathomWebhookDto) {
    this.logger.log(
      `Received Fathom Webhook for meeting: ${payload.meeting_title || payload.title}, adding to queue...`,
    );

    // Add the webhook payload to the queue for background processing
    const job = await this.jobProcessingService.addJob(
      JobName.PROCESS_FATHOM_MEETING_WEBHOOK,
      payload,
    );

    // Acknowledge receipt
    return { status: "success", jobId: job.id };
  }
}
