import {
BadRequestException,
Logger,
UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { CacheService } from "src/modules/shared/database";
import { Configkey } from "src/shared/config-keys";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
AuthToken,
AuthTokenFilter,
} from "../../domain/models/auth-token.model";
import { ITokenRepository } from "../../domain/repository/token.repository.interface";
import { OauthMapper } from "../dto/mapper/oauth.mapper";

export const GOOGLE_OAUTH_SERVICE = "GOOGLE_OAUTH_SERVICE";
export const AUTH0_OAUTH_SERVICE = "AUTH0_OAUTH_SERVICE";
/**
 * Base class for OAuth services.
 * Handles common concerns like state management, rate limiting, and token storage.
 */
export abstract class OAuthService<TTokens = any, TClient = any> {
  protected abstract readonly logger: Logger;
  protected abstract readonly provider: string;

  protected readonly RATE_LIMIT_PREFIX = "oauth:ratelimit:";
  protected readonly RATE_LIMIT_TTL = 60 * 1000; // 1 minute
  protected readonly RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

  protected readonly STATE_CACHE_PREFIX = "oauth:state:";
  protected readonly CODE_CACHE_PREFIX = "oauth:code:";
  protected readonly STATE_TTL = 10 * 60 * 1000; // 10 minutes
  protected readonly CODE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    protected readonly configService: ConfigService,
    protected readonly tokenRepository: ITokenRepository,
    protected readonly cacheService: CacheService,
  ) {}

  /**
   * Get all whitelisted scopes for this provider
   */
  abstract getOAuthScopes(metadata?: Record<string, any>): Promise<string[]>;

  /**
   * Client ID for this provider
   */
  protected abstract getClientId(): string;

  /**
   * Validate scopes against whitelist
   */
  protected async validateScopes(scopes: string[]): Promise<void> {
    const whitelisted = await this.getOAuthScopes();
    const invalidScopes = scopes.filter(
      (scope) => !whitelisted.includes(scope),
    );
    if (invalidScopes.length > 0) {
      throw new BadRequestException(
        `Invalid scopes requested for ${this.provider}: ${invalidScopes.join(", ")}. Only whitelisted scopes are allowed.`,
      );
    }
  }

  /**
   * Generate secure state
   */
  protected generateState(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Store state in cache
   */
  protected async storeState(state: string, userId?: string): Promise<void> {
    const cacheKey = `${this.STATE_CACHE_PREFIX}${this.provider}:${state}`;
    await this.cacheService.set(
      cacheKey,
      { userId, timestamp: Date.now() },
      this.STATE_TTL,
    );
  }

  /**
   * Validate and consume state
   */
  protected async validateAndConsumeState(state: string): Promise<void> {
    if (!state) {
      throw new BadRequestException("State parameter is required for security");
    }

    const cacheKey = `${this.STATE_CACHE_PREFIX}${this.provider}:${state}`;
    const storedState = await this.cacheService.get<{
      userId?: string;
      timestamp: number;
    }>(cacheKey);

    if (!storedState) {
      throw new UnauthorizedException(
        `Invalid or expired state parameter for ${this.provider}. Please restart the flow.`,
      );
    }

    await this.cacheService.del(cacheKey);
  }

  /**
   * Check if code used
   */
  protected async isCodeUsed(code: string): Promise<boolean> {
    const cacheKey = `${this.CODE_CACHE_PREFIX}${this.provider}:${code}`;
    return (await this.cacheService.get<boolean>(cacheKey)) === true;
  }

  /**
   * Mark code as used
   */
  protected async markCodeAsUsed(code: string): Promise<void> {
    const cacheKey = `${this.CODE_CACHE_PREFIX}${this.provider}:${code}`;
    await this.cacheService.set(cacheKey, true, this.CODE_TTL);
  }

  /**
   * Rate limiting
   */
  public async checkRateLimit(identifier: string): Promise<void> {
    const cacheKey = `${this.RATE_LIMIT_PREFIX}${this.provider}:${identifier}`;
    const currentCount = (await this.cacheService.get<number>(cacheKey)) || 0;

    if (currentCount >= this.RATE_LIMIT_MAX_REQUESTS) {
      throw new BadRequestException(
        "Rate limit exceeded. Please try again later.",
      );
    }

    await this.cacheService.set(
      cacheKey,
      currentCount + 1,
      this.RATE_LIMIT_TTL,
    );
  }

  /**
   * Get paged tokens
   */
  async getTokens(filter?: BaseFilter<AuthTokenFilter>) {
    const props = { ...filter?.props, provider: this.provider };
    const result = await this.tokenRepository.findPaged({
      pageIndex: filter?.pageIndex,
      pageSize: filter?.pageSize,
      props: props,
    });
    return new PagedResult(
      result.content.map((t) => OauthMapper.toDto(t)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  /**
   * Generate Auth URL
   */
  async getAuthUrl(
    scopes: string[],
    state?: string,
  ): Promise<{ url: string; state: string }> {
    const requestedScopes = [...new Set([...scopes])];
    await this.validateScopes(requestedScopes);

    const secureState = state || this.generateState();
    await this.storeState(secureState);

    const url = await this.generateProviderAuthUrl(
      requestedScopes,
      secureState,
    );

    this.logger.log(
      `Generated OAuth URL for ${this.provider} with state: ${secureState.substring(0, 8)}...`,
    );
    return { url, state: secureState };
  }

  /**
   * Provider specific auth URL generation
   */
  protected abstract generateProviderAuthUrl(
    scopes: string[],
    state: string,
    metadata?: Record<string, any>,
  ): Promise<string>;

  /**
   * Comprehensive logic for handling OAuth redirection callbacks
   */
  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<{
    success: boolean;
    email?: string;
    error?: string;
    reason?: string;
  }> {
    const { code, state, error } = params;

    if (error) {
      this.logger.warn(`${this.provider} OAuth callback error: ${error}`);
      return {
        success: false,
        error:
          error === "access_denied"
            ? "You denied the authorization request. Please grant the required permissions to continue."
            : error,
        reason: error,
      };
    }

    if (!code || !state) {
      this.logger.warn(
        `${this.provider} OAuth callback error: Missing code or state`,
      );
      return {
        success: false,
        error: "Missing authorization code or state parameter.",
        reason: "missing_parameters",
      };
    }

    try {
      // Validate state parameter (CSRF protection)
      await this.validateAndConsumeState(state);

      // Check if authorization code has already been used
      if (await this.isCodeUsed(code)) {
        throw new BadRequestException(
          "Authorization code has already been used. Please restart the OAuth flow.",
        );
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);

      // Mark code as used immediately after successful exchange
      await this.markCodeAsUsed(code);

      const token = await this.storeTokens(tokens);
      return {
        success: true,
        email: token.email,
      };
    } catch (err) {
      this.logger.error(
        `Failed to handle ${this.provider} OAuth callback: ${err.message}`,
        err.stack,
      );
      return {
        success: false,
        error:
          err instanceof BadRequestException ||
          err instanceof UnauthorizedException
            ? err.message
            : `Failed to process ${this.provider} OAuth callback. Please try again.`,
        reason:
          err instanceof BadRequestException
            ? "invalid_request"
            : "processing_failed",
      };
    }
  }
  protected async storeTokens(tokens: Awaited<TTokens>) {
    // Get user identification
    const email = await this.getUserEmail(tokens);

    // Encrypt and store tokens
    const encryptionKey = this.configService.get<string>(Configkey.APP_SECRET)!;
    const authToken = await AuthToken.create(
      {
        clientId: this.getClientId(),
        provider: this.provider,
        email,
        accessToken: this.getAccessTokenFromTokens(tokens),
        refreshToken: this.getRefreshTokenFromTokens(tokens),
        tokenType: this.getTokenTypeFromTokens(tokens),
        expiresAt: this.getExpiresAtFromTokens(tokens),
        scope: this.getScopeFromTokens(tokens),
      },
      encryptionKey,
    );

    const token = await this.tokenRepository.create(authToken);
    this.logger.log(
      `Successfully stored ${this.provider} OAuth tokens for ${email}`,
    );
    return token;
  }

  protected abstract exchangeCodeForTokens(code: string): Promise<TTokens>;
  protected abstract getUserEmail(tokens: TTokens): Promise<string>;
  protected abstract getAccessTokenFromTokens(tokens: TTokens): string;
  protected abstract getRefreshTokenFromTokens(tokens: TTokens): string;
  protected abstract getExpiresAtFromTokens(tokens: TTokens): number;
  protected abstract getTokenTypeFromTokens(tokens: TTokens): string;
  protected abstract getScopeFromTokens(tokens: TTokens): string;
  abstract getAuthenticatedClient(scope: string | string[]): Promise<TClient>;

  /**
   * Revoke tokens
   */
  async revokeTokens(id: string): Promise<void> {
    const tokenRecord = await this.tokenRepository.findById(id);
    if (!tokenRecord) {
      throw new Error(`Token not found with id ${id}`);
    }

    const encryptionKey = this.configService.get<string>(Configkey.APP_SECRET)!;
    const accessToken = await tokenRecord.getAccessToken(encryptionKey);

    try {
      await this.revokeProviderToken(accessToken);
      this.logger.log(`Revoked ${this.provider} token`);
    } catch (error) {
      this.logger.warn(
        `Failed to revoke ${this.provider} token: ${error.message}`,
      );
    }

    await this.tokenRepository.delete(tokenRecord.id);
  }

  protected abstract revokeProviderToken(accessToken: string): Promise<void>;

  /**
   * Get valid access token
   */
  protected async getValidAccessToken(
    clientId: string,
    scope: string,
  ): Promise<string> {
    const tokenRecord = await this.tokenRepository.findByAttribute({
      clientId,
      provider: this.provider,
      scope,
    });

    if (!tokenRecord) {
      throw new Error(`No ${this.provider} token found with scope ${scope}.`);
    }

    if (tokenRecord.isExpired()) {
      await this.refreshAccessToken(tokenRecord);
    }

    const encryptionKey = this.configService.get<string>(Configkey.APP_SECRET)!;
    return await tokenRecord.getAccessToken(encryptionKey);
  }

  /**
   * Refresh access token
   */
  protected async refreshAccessToken(tokenRecord: AuthToken): Promise<void> {
    const encryptionKey = this.configService.get<string>(Configkey.APP_SECRET)!;
    const refreshToken = await tokenRecord.getRefreshToken(encryptionKey);

    if (!refreshToken) {
      throw new Error(`No refresh token available for ${this.provider}.`);
    }

    const newTokens = await this.refreshProviderToken(refreshToken);

    await tokenRecord.update(
      {
        accessToken: this.getAccessTokenFromTokens(newTokens),
        expiresAt: this.getExpiresAtFromTokens(newTokens),
        tokenType: this.getTokenTypeFromTokens(newTokens),
      },
      encryptionKey,
    );

    await this.tokenRepository.update(tokenRecord.id, tokenRecord);
  }

  protected abstract refreshProviderToken(
    refreshToken: string,
  ): Promise<TTokens>;
}
