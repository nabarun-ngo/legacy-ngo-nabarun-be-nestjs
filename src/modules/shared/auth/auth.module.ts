import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PermissionsGuard } from "./application/guards/permissions.guard";
import { UnifiedAuthGuard } from "./application/guards/unified-auth.guard";
import { ApiKeyEventsHandler } from "./application/handler/api-key-events.handler";
import {
AUTH0_OAUTH_SERVICE,
GOOGLE_OAUTH_SERVICE,
} from "./application/services";
import { ApiKeyService } from "./application/services/api-key.service";
import { RecaptchaService } from "./application/services/google-recaptcha.service";
import { JwtAuthService } from "./application/services/jwt-auth.service";
import { API_KEY_REPOSITORY } from "./domain/repository/api-key.repository.interface";
import { TOKEN_REPOSITORY } from "./domain/repository/token.repository.interface";
import { Auth0OAuthService } from "./infrastructure/external/auth0-oauth.service";
import { GoogleOAuthService } from "./infrastructure/external/google-oauth.service";
import { ApiKeyRepository } from "./infrastructure/persistence/api-key.repository";
import { TokenRepository } from "./infrastructure/persistence/token.repository";
import { ApiKeyController } from "./presentation/controllers/api-key.controller";
import { OAuthController } from "./presentation/controllers/oauth.controller";

@Module({
  imports: [HttpModule],
  controllers: [OAuthController, ApiKeyController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: TOKEN_REPOSITORY,
      useClass: TokenRepository,
    },
    {
      provide: API_KEY_REPOSITORY,
      useClass: ApiKeyRepository,
    },
    {
      provide: GOOGLE_OAUTH_SERVICE,
      useClass: GoogleOAuthService,
    },
    {
      provide: AUTH0_OAUTH_SERVICE,
      useClass: Auth0OAuthService,
    },
    GoogleOAuthService,
    Auth0OAuthService,
    JwtAuthService,
    ApiKeyService,
    PermissionsGuard,
    UnifiedAuthGuard,
    ApiKeyEventsHandler,
    RecaptchaService,
  ],
  exports: [GOOGLE_OAUTH_SERVICE, AUTH0_OAUTH_SERVICE],
})
export class AuthModule {}
