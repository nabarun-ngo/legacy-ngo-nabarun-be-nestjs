import {
Injectable,
OnModuleInit,
UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jose from "jose";
import { Configkey } from "src/shared/config-keys";
import { AuthUser } from "../../domain/models/api-user.model";

@Injectable()
export class JwtAuthService implements OnModuleInit {
  private jwks: jose.JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(private config: ConfigService) {
    const domain = this.config.get<string>(Configkey.AUTH0_DOMAIN)!;
    this.audience = this.config.get<string>(
      Configkey.AUTH0_RESOURCE_API_AUDIENCE,
    )!;
    this.issuer = `https://${domain}/`;
    if (!this.issuer || !this.audience) {
      throw new Error("AUTH0_DOMAIN must be set");
    }
  }

  onModuleInit() {
    // Create JWKS client using jose
    this.jwks = jose.createRemoteJWKSet(
      new URL(`${this.issuer}.well-known/jwks.json`),
    );
  }

  async verifyToken(token: string): Promise<AuthUser> {
    try {
      // Verify JWT with jose - single function call!
      const { payload } = await jose.jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ["RS256"], // Auth0 uses RS256
      });

      return {
        sub: payload.sub,
        name: payload.name,
        permissions: payload.permissions,
        user_roles: payload.user_roles,
        profile_name: payload.profile_name,
        user_id: payload.user_id,
        aud: payload.aud,
        iss: payload.iss,
        iat: payload.iat,
        exp: payload.exp,
        email: payload.email,
        picture: payload.picture,
        email_verified: payload.email_verified,
        profile_id: payload.profile_id,
        profile_updated: payload.profile_updated,
        type: "jwt",
      } as AuthUser;
    } catch (error) {
      // jose provides specific error types
      if (error.code === "ERR_JWT_EXPIRED") {
        throw new UnauthorizedException("Token has expired");
      }
      if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
        throw new UnauthorizedException("Invalid token signature");
      }
      if (error.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
        throw new UnauthorizedException("Token claim validation failed");
      }
      throw new UnauthorizedException("Token verification failed");
    }
  }
}
