import { IRepository } from "src/shared/interfaces/repository.interface";
import { AuthToken,AuthTokenFilter } from "../models/auth-token.model";

export interface ITokenRepository
  extends IRepository<AuthToken, string, AuthTokenFilter> {
  findByAttribute(filter: Partial<AuthTokenFilter>): Promise<AuthToken | null>;
}

export const TOKEN_REPOSITORY = Symbol("TOKEN_REPOSITORY");
