import * as crypto from "crypto";
import { randomUUID } from "crypto";
import { AggregateRoot } from "src/shared/models/aggregate-root";
import { hashText } from "src/shared/utilities/crypto.util";

export class ApiKeyFilter {
  name?: string;
  permissions?: string[];
}

export class ApiKey extends AggregateRoot<string> {
  private readonly _key: string;
  private _name: string;
  private _keyId: string;
  private _permissions: string[];
  private _rateLimit?: number;
  private _expiresAt?: Date;
  private _lastUsedAt?: Date;
  private _userId?: string;
  private _userName?: string;

  constructor(data: {
    id: string;
    key: string;
    keyId: string;
    name: string;
    permissions: string[];
    rateLimit?: number;
    expiresAt?: Date;
    lastUsedAt?: Date;
    userId?: string;
    userName?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(data.id, data.createdAt, data.updatedAt);
    this._key = data.key;
    this._keyId = data.keyId;
    this._name = data.name;
    this._permissions = data.permissions;
    this._rateLimit = data.rateLimit;
    this._expiresAt = data.expiresAt;
    this._lastUsedAt = data.lastUsedAt;
    this._userId = data.userId;
    this._userName = data.userName;
  }

  static async create(data: {
    name: string;
    permissions: string[];
    expiresAt?: Date;
    userId?: string;
    userName?: string;
  }): Promise<{ keyInfo: ApiKey; token: string }> {
    const apiKey = this.generateSecureKey();
    const hashedToken = await hashText(apiKey);
    const keyInfo = new ApiKey({
      id: randomUUID(),
      key: hashedToken,
      keyId: this.fetchKeyId(apiKey),
      name: data.name,
      permissions: data.permissions,
      expiresAt: data.expiresAt,
      userId: data.userId,
      userName: data.userName,
    });
    return { keyInfo: keyInfo, token: apiKey };
  }

  revoke(): void {
    this._expiresAt = new Date();
    this.touch();
  }

  used() {
    this._lastUsedAt = new Date();
    this.touch();
  }

  isExpired(): boolean {
    if (!this._expiresAt) return false;
    return this._expiresAt < new Date();
  }

  private static generateSecureKey(length: number = 32): string {
    const buffer = crypto.randomBytes(length);
    const keyId = crypto
      .randomBytes(length)
      .toString("base64", 0, 12)
      .replaceAll("_", "");
    return `sk_${keyId}_${buffer.toString("base64url")}`;
  }

  static fetchKeyId(apiKey: string): string {
    try {
      const parts = apiKey.split("_");
      if (parts.length < 3 || parts[0] !== "sk") {
        throw new Error("Invalid API key format");
      }
      return parts[1];
    } catch (e) {
      return "";
    }
  }

  updatePermissions(permissions: string[]): void {
    this._permissions = permissions;
    this.touch();
  }

  get name(): string {
    return this._name;
  }

  get permissions(): string[] {
    return this._permissions;
  }

  get rateLimit(): number | undefined {
    return this._rateLimit;
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt;
  }

  get lastUsedAt(): Date | undefined {
    return this._lastUsedAt;
  }

  get key(): string {
    return this._key;
  }
  get keyId(): string {
    return this._keyId;
  }
  get userId(): string | undefined {
    return this._userId;
  }
  get userName(): string | undefined {
    return this._userName;
  }
}
