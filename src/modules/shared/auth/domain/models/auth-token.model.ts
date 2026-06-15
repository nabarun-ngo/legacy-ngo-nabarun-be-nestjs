import { randomUUID } from "crypto";
import { AggregateRoot } from "src/shared/models/aggregate-root";
import { decryptText,encryptText } from "src/shared/utilities/crypto.util";

export class AuthTokenFilter {
  provider?: string;
  clientId?: string;
  scope?: string;
  email?: string;
}

export class AuthToken extends AggregateRoot<string> {
  private readonly _clientId: string;
  private readonly _provider: string;
  private readonly _email: string;
  private _accessToken: string;
  private readonly _refreshToken: string;
  private _tokenType?: string;
  private _expiresAt: Date;
  private readonly _scope?: string;

  constructor(
    id: string,
    clientId: string,
    provider: string,
    email: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
    tokenType?: string,
    scope?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._clientId = clientId;
    this._provider = provider;
    this._email = email;
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    this._tokenType = tokenType;
    this._expiresAt = expiresAt;
    this._scope = scope;
  }

  static async create(
    data: {
      clientId: string;
      provider: string;
      email: string;
      accessToken: string;
      refreshToken: string;
      tokenType?: string;
      expiresAt: number;
      scope?: string;
    },
    encryptionKey: string,
  ): Promise<AuthToken> {
    return new AuthToken(
      randomUUID(),
      data.clientId,
      data.provider,
      data.email,
      await encryptText(data.accessToken, encryptionKey),
      await encryptText(data.refreshToken, encryptionKey),
      new Date(data.expiresAt),
      data.tokenType,
      data.scope,
    );
  }

  async update(
    data: {
      accessToken: string;
      expiresAt: number;
      tokenType?: string;
    },
    encryptionKey: string,
  ): Promise<AuthToken> {
    this._accessToken = await encryptText(data.accessToken, encryptionKey);
    this._tokenType = data.tokenType;
    this._expiresAt = new Date(data.expiresAt);
    this.touch();
    return this;
  }

  /**
   * Getter clientId
   * @return {string}
   */
  public get clientId(): string {
    return this._clientId;
  }

  /**
   * Getter provider
   * @return {string}
   */
  public get provider(): string {
    return this._provider;
  }

  /**
   * Getter email
   * @return {string}
   */
  public get email(): string {
    return this._email;
  }

  /**
   * Getter accessToken
   * @return {string}
   */
  public async getAccessToken(encryptionKey: string): Promise<string> {
    return await decryptText(this._accessToken, encryptionKey);
  }

  get scope(): string | undefined {
    return this._scope;
  }

  get refreshToken(): string {
    return this._refreshToken;
  }

  get accessToken(): string {
    return this._accessToken;
  }

  async getRefreshToken(encryptionKey: string): Promise<string | undefined> {
    return await decryptText(this._refreshToken, encryptionKey);
  }

  get tokenType(): string | undefined {
    return this._tokenType;
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt;
  }
  isExpired(): boolean {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return fiveMinutesFromNow > this._expiresAt;
  }
}
