import { Inject,Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Credentials,OAuth2Client } from "google-auth-library";
import { CacheService } from "src/modules/shared/database";
import { AppTechnicalError } from "src/modules/shared/observability/application/events/app-technical-error.event";
import { Configkey } from "src/shared/config-keys";
import { OAuthService } from "../../application/services/oauth.service";
import {
TOKEN_REPOSITORY,
type ITokenRepository,
} from "../../domain/repository/token.repository.interface";
import { GOOGLE_SCOPES } from "../../scopes";

@Injectable()
export class GoogleOAuthService extends OAuthService<
  Credentials,
  OAuth2Client
> {
  protected readonly logger = new Logger(GoogleOAuthService.name);
  protected readonly provider = "google";
  private readonly oauth2Client: OAuth2Client;
  private readonly clientId: string;

  constructor(
    configService: ConfigService,
    @Inject(TOKEN_REPOSITORY) tokenRepository: ITokenRepository,
    private readonly eventEmitter: EventEmitter2,
    cacheService: CacheService,
  ) {
    super(configService, tokenRepository, cacheService);

    this.clientId = this.configService.get<string>(Configkey.GOOGLE_CLIENT_ID)!;
    const clientSecret = this.configService.get<string>(
      Configkey.GOOGLE_CLIENT_SECRET,
    )!;
    const redirectUri = this.configService.get<string>(
      Configkey.GOOGLE_REDIRECT_URI,
    )!;

    if (!this.clientId || !clientSecret) {
      throw new Error(
        "Google OAuth credentials are missing. Please configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET",
      );
    }

    this.oauth2Client = new OAuth2Client({
      clientId: this.clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUri,
    });
  }

  async getOAuthScopes(): Promise<string[]> {
    return [
      ...this.getDefaultScopes(),
      GOOGLE_SCOPES.gmail,
      GOOGLE_SCOPES.calendar,
      GOOGLE_SCOPES.drive,
    ];
  }

  private getDefaultScopes(): string[] {
    return [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
      "email",
      "profile",
    ];
  }

  protected getClientId(): string {
    return this.clientId;
  }

  protected async generateProviderAuthUrl(
    scopes: string[],
    state: string,
  ): Promise<string> {
    const finalScopes = [...new Set([...this.getDefaultScopes(), ...scopes])];
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline", // Required to get refresh token
      scope: finalScopes,
      prompt: "consent", // Force consent to get refresh token
      state: state,
      response_type: "code",
      include_granted_scopes: true,
    });
  }

  protected async exchangeCodeForTokens(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    if (!tokens.access_token) {
      throw new Error("No access token received from Google");
    }
    return tokens;
  }

  protected async getUserEmail(tokens: Credentials): Promise<string> {
    // Verify and decode ID token
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      throw new Error("Could not retrieve email from Google userinfo");
    }
    return email;
  }

  protected getAccessTokenFromTokens(tokens: Credentials): string {
    return tokens.access_token!;
  }

  protected getRefreshTokenFromTokens(tokens: Credentials): string {
    return tokens.refresh_token!;
  }

  protected getExpiresAtFromTokens(tokens: Credentials): number {
    return tokens.expiry_date!;
  }

  protected getTokenTypeFromTokens(tokens: Credentials): string {
    return tokens.token_type || "Bearer";
  }

  protected getScopeFromTokens(tokens: Credentials): string {
    return tokens.scope!;
  }

  protected async revokeProviderToken(accessToken: string): Promise<void> {
    await this.oauth2Client.revokeToken(accessToken);
  }

  protected async refreshProviderToken(
    refreshToken: string,
  ): Promise<Credentials> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh Google access token");
    }
    return credentials;
  }

  /**
   * Get OAuth2Client with valid credentials for a user
   * This is a Google-specific helper method.
   */
  override async getAuthenticatedClient(
    scope: string,
    clientId: string = this.clientId,
  ): Promise<OAuth2Client> {
    try {
      const accessToken = await this.getValidAccessToken(clientId, scope);
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });
      return this.oauth2Client;
    } catch (error) {
      this.eventEmitter.emit(
        AppTechnicalError.name,
        new AppTechnicalError(error),
      );
      this.logger.fatal(
        `Failed to get authenticated client: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
