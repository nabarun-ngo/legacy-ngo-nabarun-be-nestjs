import { Body,Controller,Post } from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import { ApiAutoResponse } from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import { RequirePermissions } from "../../../auth/application/decorators/require-permissions.decorator";
import { UseApiKey } from "../../../auth/application/decorators/use-api-key.decorator";
import { EmailService } from "../../application/services/email.service";
import { SendEmailDto } from "../dtos/correspondence.dto";
import { SendEmailResult } from "../dtos/email.dto";

@ApiTags(CorrespondenceController.name)
@ApiSecurity("api-key")
@ApiBearerAuth("jwt")
@Controller("correspondence")
export class CorrespondenceController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send-email")
  @ApiOperation({ summary: "Send email" })
  @ApiAutoResponse(SendEmailResult, {
    status: 200,
    description: "Email sent successfully",
    wrapInSuccessResponse: true,
  })
  @RequirePermissions("create:send_email")
  @UseApiKey()
  async sendEmail(
    @Body() request: SendEmailDto,
  ): Promise<SuccessResponse<SendEmailResult>> {
    return new SuccessResponse(await this.emailService.sendEmail(request));
  }
}
