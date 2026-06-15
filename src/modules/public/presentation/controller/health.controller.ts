import { Controller,Get } from "@nestjs/common";
import { ApiOperation,ApiTags } from "@nestjs/swagger";
import { IgnoreCaptchaValidation } from "../../../shared/auth/application/decorators/ignore-captcha.decorator";
import { Public } from "../../../shared/auth/application/decorators/public.decorator";

@ApiTags(HealthController.name)
@Controller()
@Public()
export class HealthController {
  @IgnoreCaptchaValidation()
  @Get("health")
  @ApiOperation({ summary: "Health check endpoint" })
  health() {
    return {
      status: "UP",
      timestamp: new Date().toISOString(),
    };
  }
}
