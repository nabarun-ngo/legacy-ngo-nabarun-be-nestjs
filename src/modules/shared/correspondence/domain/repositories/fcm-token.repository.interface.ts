import { BaseRepository } from "src/shared/models/repository.base";
import { FcmToken } from "../models/fcm-token.model";

export interface IFcmTokenRepository
  extends BaseRepository<FcmToken, string, any> {
  findByUserId(userId: string): Promise<FcmToken[]>;

  findByToken(token: string): Promise<FcmToken | null>;

  findActiveByUserId(userId: string): Promise<FcmToken[]>;

  deactivateToken(token: string): Promise<void>;

  deactivateAllByUserId(userId: string): Promise<void>;

  deleteInactiveTokens(daysOld: number): Promise<number>;
}

export const IFcmTokenRepository = Symbol("IFcmTokenRepository");
