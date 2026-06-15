import {
BadRequestException,
Controller,
Get,
Header,
Inject,
Logger,
Param,
Query,
Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { IgnoreCaptchaValidation } from "src/modules/shared/auth/application/decorators/ignore-captcha.decorator";
import { Public } from "src/modules/shared/auth/application/decorators/public.decorator";
import {
GOOGLE_OAUTH_SERVICE,
OAuthService,
} from "src/modules/shared/auth/application/services/oauth.service";
import { renderOAuthCallback } from "../utilities/oauth-template.utility";

@ApiTags(CallbackController.name)
@Controller("callback")
@Public()
export class CallbackController {
  private readonly logger = new Logger(CallbackController.name);
  private readonly serviceMap: Map<string, OAuthService>;

  constructor(
    @Inject(GOOGLE_OAUTH_SERVICE)
    private readonly googleOAuthService: OAuthService,
  ) {
    this.serviceMap = new Map<string, OAuthService>([
      ["google", this.googleOAuthService],
    ]);
  }

  private getService(provider: string): OAuthService {
    const service = this.serviceMap.get(provider.toLowerCase());
    if (!service) {
      throw new BadRequestException(
        `OAuth provider "${provider}" is not supported.`,
      );
    }
    return service;
  }

  /**
   * Backend callback endpoint - Providers redirect here directly
   * This is the SECURE approach - code never exposed to frontend
   */
  @Get("oauth/:provider")
  @Public()
  @IgnoreCaptchaValidation()
  @Header("Content-Type", "text/html")
  async handleOAuthCallbackRedirect(
    @Param("provider") provider: string,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const service = this.getService(provider);

      // Rate limiting check (using code as identifier if present)
      if (code) {
        try {
          await service.checkRateLimit(code);
        } catch (rateLimitError) {
          const html = renderOAuthCallback({
            isSuccess: false,
            message: "Too many requests.",
            reason: "rate_limit_exceeded",
            description: "Please wait a minute and try again.",
          });
          return res.send(html);
        }
      }
      const result = await service.handleCallback({ code, state, error });

      const html = renderOAuthCallback({
        isSuccess: result.success,
        title: result.success
          ? "Authorization Successful!"
          : "Authorization Failed",
        message: result.success
          ? `Your ${provider} account has been successfully connected.`
          : result.error || "Failed to process OAuth callback.",
        description: result.success
          ? "You can now use authorized features in the application."
          : "Please try the authorization process again.",
        reason: result.reason,
        email: result.email,
      });
      return res.send(html);
    } catch (error) {
      const html = renderOAuthCallback({
        isSuccess: false,
        message: error.message,
        reason: "reason_unknown",
        description: "",
      });
      return res.send(html);
    }
  }
}
