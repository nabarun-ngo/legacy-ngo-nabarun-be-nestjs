import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IGNORE_CAPTCHA } from "../decorators/ignore-captcha.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { USE_API_KEY } from "../decorators/use-api-key.decorator";
import { ApiKeyService } from "../services/api-key.service";
import { RecaptchaService } from "../services/google-recaptcha.service";
import { JwtAuthService } from "../services/jwt-auth.service";
import { traceStorage } from "nestjs-shared/core";

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(
    private authService: JwtAuthService,
    private apiKeyService: ApiKeyService,
    private recaptchaService: RecaptchaService,
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const ignoreCaptcha = this.reflector.getAllAndOverride<boolean>(
        IGNORE_CAPTCHA,
        [context.getHandler(), context.getClass()],
      );
      return ignoreCaptcha
        ? true
        : this.validateCaptcha(context.switchToHttp().getRequest());
    }

    // Check if route explicitly requires API key
    const useApiKey = this.reflector.getAllAndOverride<boolean>(USE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    if (useApiKey || this.extractApiKey(request)) {
      // API Key authentication
      return this.validateApiKey(request);
    } else {
      // Default: JWT authentication
      return this.validateJwt(request);
    }
  }

  private async validateJwt(request: any): Promise<boolean> {
    const token = this.extractJwtToken(request);

    if (!token) {
      throw new UnauthorizedException("JWT token is required");
    }

    try {
      const user = await this.authService.verifyToken(token);
      request.user = user;

      // Update trace context with user info
      const store = traceStorage.getStore();
      if (store && store.user) {
        store.user.userId = user.profile_id || "unknown";
        store.user.userName = user.profile_name || user.email || "unknown";
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired JWT token.");
    }
  }

  private async validateApiKey(request: any): Promise<boolean> {
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException("API key is required");
    }

    const user = await this.apiKeyService.validateApiKey(apiKey);
    request.user = user;

    // Update trace context with user info
    const store = traceStorage.getStore();
    if (store && store.user) {
      store.user.userId =
        (user as any).user_id || (user as any).sub || "unknown";
      store.user.userName = user.profile_name || user.email || "unknown";
    }

    return true;
  }

  private async validateCaptcha(request: any): Promise<boolean> {
    const { token, action } = this.extractCaptchaToken(request);
    if (token && action) {
      const rawThreshold = process.env.GOOGLE_RECAPTCHA_THRESHOLD;
      const threshold = rawThreshold ? parseFloat(rawThreshold) : 0.5;

      return await this.recaptchaService.verifyToken(
        token,
        action,
        Number.isFinite(threshold) ? threshold : 0.5,
      );
    }
    throw new UnauthorizedException("Captcha token and action is required");
  }
  private extractCaptchaToken(request: any): { token: string; action: string } {
    const captchaToken = request.headers["x-recaptcha-token"];
    const captchAction = request.headers["x-recaptcha-action"];
    return { token: captchaToken, action: captchAction };
  }

  private extractJwtToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(" ");
    // JWT tokens don't start with 'sk_'
    if (type === "Bearer" && token && !token.startsWith("sk_")) {
      return token;
    }
    return null;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header for API key (starts with sk_)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, key] = authHeader.split(" ");
      if (type.toLowerCase() === "apikey") {
        return key;
      }
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers["x-api-key"];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }
}
