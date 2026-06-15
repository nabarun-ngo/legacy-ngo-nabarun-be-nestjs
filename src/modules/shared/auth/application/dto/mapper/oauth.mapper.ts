import { AuthToken } from "../../../domain/models/auth-token.model";
import { AuthTokenDto } from "../oauth..dto";

export class OauthMapper {
  static toDto(token: AuthToken): AuthTokenDto {
    return {
      id: token.id,
      clientId: token.clientId,
      provider: token.provider,
      email: token.email,
      expiresAt: token.expiresAt,
      scope: token.scope?.split(" "),
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }
}
