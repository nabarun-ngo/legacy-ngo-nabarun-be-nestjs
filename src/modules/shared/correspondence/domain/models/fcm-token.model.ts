import { randomUUID } from "crypto";
import { User } from "src/modules/user/domain/model/user.model";
import { AggregateRoot } from "src/shared/models/aggregate-root";

export class FcmToken extends AggregateRoot<string> {
  #userId: string;
  #user?: Partial<User>;
  #token: string;
  #deviceType?: string;
  #deviceName?: string;
  #browser?: string;
  #os?: string;
  #isActive: boolean;
  #lastUsedAt: Date;

  constructor(
    id: string,
    userId: string,
    token: string,
    options?: {
      user?: Partial<User>;
      deviceType?: string;
      deviceName?: string;
      browser?: string;
      os?: string;
      isActive?: boolean;
      lastUsedAt?: Date;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    super(id, options?.createdAt, options?.updatedAt);
    this.#userId = userId;
    this.#user = options?.user;
    this.#token = token;
    this.#deviceType = options?.deviceType;
    this.#deviceName = options?.deviceName;
    this.#browser = options?.browser;
    this.#os = options?.os;
    this.#isActive = options?.isActive ?? true;
    this.#lastUsedAt = options?.lastUsedAt || new Date();
  }

  static create(op: {
    userId: string;
    token: string;
    deviceType?: string;
    deviceName?: string;
    browser?: string;
    os?: string;
  }): FcmToken {
    return new FcmToken(randomUUID(), op.userId, op.token, {
      deviceType: op.deviceType,
      deviceName: op.deviceName,
      browser: op.browser,
      os: op.os,
    });
  }

  deactivate(): void {
    this.#isActive = false;
  }

  activate(): void {
    this.#isActive = true;
  }

  updateLastUsed(): void {
    this.#lastUsedAt = new Date();
  }

  // Getters
  get userId() {
    return this.#userId;
  }
  get user() {
    return this.#user;
  }
  get token() {
    return this.#token;
  }
  get deviceType() {
    return this.#deviceType;
  }
  get deviceName() {
    return this.#deviceName;
  }
  get browser() {
    return this.#browser;
  }
  get os() {
    return this.#os;
  }
  get isActive() {
    return this.#isActive;
  }
  get lastUsedAt() {
    return this.#lastUsedAt;
  }
}
