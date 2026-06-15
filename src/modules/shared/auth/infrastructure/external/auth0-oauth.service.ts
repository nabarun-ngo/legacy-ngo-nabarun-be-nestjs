import { Inject,Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticationClient,ManagementClient,TokenSet } from "auth0";
import { CacheService } from "src/modules/shared/database";
import { Configkey } from "src/shared/config-keys";
import { ThirdPartyException } from "src/shared/exceptions/third-party-exception";
import { OAuthService } from "../../application/services";
import {
type ITokenRepository,
TOKEN_REPOSITORY,
} from "../../domain/repository/token.repository.interface";

export type Auth0ResourceServer = Awaited<
  ReturnType<ManagementClient["resourceServers"]["get"]>
>;

@Injectable()
export class Auth0OAuthService extends OAuthService<
  TokenSet,
  ManagementClient
> {
  protected provider = "auth0";
  protected readonly logger = new Logger(Auth0OAuthService.name);
  protected readonly managementClient: ManagementClient;
  private readonly clientId: string;
  private readonly domain: string;
  private readonly audience: string;

  constructor(
    configService: ConfigService,
    @Inject(TOKEN_REPOSITORY) tokenRepository: ITokenRepository,
    cacheService: CacheService,
  ) {
    super(configService, tokenRepository, cacheService);
    this.domain = this.configService.get<string>(Configkey.AUTH0_DOMAIN)!;
    this.clientId = this.configService.get<string>(
      Configkey.AUTH0_MANAGEMENT_CLIENT_ID,
    )!;
    const clientSecret = this.configService.get<string>(
      Configkey.AUTH0_MANAGEMENT_CLIENT_SECRET,
    )!;
    this.audience = `https://${this.domain}/api/v2/`;

    if (!this.domain || !this.clientId || !clientSecret || !this.audience) {
      throw new Error("Auth0 Management API configuration is incomplete.");
    }

    this.managementClient = new ManagementClient({
      domain: this.domain,
      clientId: this.clientId,
      token: async () => await this.retrieveAccessToken(this.audience),
      audience: this.audience,
      logging: {
        level: "info",
        silent: false,
      },
    });
  }
  private async retrieveAccessToken(audience: string): Promise<string> {
    try {
      return await this.getValidAccessToken(this.clientId, audience);
    } catch (e) {
      const tokenSet = await this.createAccessToken(audience);
      await this.storeTokens(tokenSet);
      return await this.getValidAccessToken(this.clientId, audience);
    }
  }
  private async createAccessToken(audience: string) {
    const clientSecret = this.configService.get<string>(
      Configkey.AUTH0_MANAGEMENT_CLIENT_SECRET,
    )!;
    const client = new AuthenticationClient({
      domain: this.domain,
      clientId: this.clientId,
      clientSecret: clientSecret,
    });
    const tokenSet = await client.oauth.clientCredentialsGrant({
      audience: audience,
    });
    return tokenSet.data;
  }

  /**
   * Get all whitelisted scopes for a specific resource server (audience)
   */
  async getOAuthScopes(metadata?: Record<string, any>): Promise<string[]> {
    try {
      const audience = metadata?.audience || `https://${this.domain}/api/v2/`;
      const response =
        await this.managementClient.resourceServers.get(audience);
      const scopes = response.scopes;
      return (scopes || []).map((s) => s.value);
    } catch (e) {
      this.logger.error(
        `Failed to get scopes for ${metadata?.audience || "Management API"}: ${e.message}`,
        e.stack,
      );
      throw new ThirdPartyException("auth0", e);
    }
  }

  protected getClientId(): string {
    return this.clientId;
  }

  async getAuthenticatedClient(scope: string): Promise<ManagementClient> {
    return this.managementClient;
  }

  protected async getUserEmail(tokens: TokenSet): Promise<string> {
    return `${this.clientId}@${this.domain}`;
  }
  protected getAccessTokenFromTokens(tokens: TokenSet): string {
    return tokens.access_token;
  }
  protected getRefreshTokenFromTokens(tokens: TokenSet): string {
    return tokens.refresh_token ?? "Not Available";
  }
  protected getExpiresAtFromTokens(tokens: TokenSet): number {
    return tokens.expires_in ?? 3600;
  }
  protected getTokenTypeFromTokens(tokens: TokenSet): string {
    return tokens.token_type ?? "Bearer";
  }
  protected getScopeFromTokens(tokens: TokenSet): string {
    return this.audience;
  }
  protected async revokeProviderToken(accessToken: string): Promise<void> {
    return;
  }
  protected async refreshProviderToken(
    refreshToken: string,
  ): Promise<TokenSet> {
    return await this.createAccessToken(this.audience);
  }

  protected generateProviderAuthUrl(
    scopes: string[],
    state: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    throw new Error(
      "Authorization code flow is not supported for Auth0 Management API.",
    );
  }
  protected exchangeCodeForTokens(code: string): Promise<TokenSet> {
    throw new Error(
      "Authorization code flow is not supported for Auth0 Management API.",
    );
  }
}
