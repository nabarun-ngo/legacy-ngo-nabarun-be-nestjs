import { Expose } from "class-transformer";
import { randomUUID } from "crypto";
import { BaseDomain } from "src/shared/models/base-domain";

@Expose()
export class PhoneNumber extends BaseDomain<string> {
  // 🔒 TRUE private fields
  #phoneCode: string;
  #phoneNumber: string;
  #hidden: boolean;

  constructor(
    protected _id: string,
    phoneCode: string,
    phoneNumber: string,
    hidden = false,
  ) {
    super(_id);

    this.#phoneCode = phoneCode;
    this.#phoneNumber = phoneNumber;
    this.#hidden = hidden;
  }

  get fullNumber(): string {
    return `+${this.#phoneCode} ${this.#phoneNumber}`;
  }

  public static create(
    phoneCode: string,
    phoneNumber: string,
    hidden = false,
  ): PhoneNumber {
    if (!phoneCode || !phoneNumber) {
      throw new Error("phoneCode and phoneNumber are required");
    }
    return new PhoneNumber(randomUUID(), phoneCode, phoneNumber, hidden);
  }

  public update(detail: PhoneNumber) {
    this.#phoneCode = detail.phoneCode;
    this.#phoneNumber = detail.phoneNumber;
    this.#hidden = detail.hidden;
    this.touch();
    return this;
  }

  public show(): void {
    this.#hidden = false;
  }

  public hide(): void {
    this.#hidden = true;
  }

  // === Getters (required for BaseDomain.toJson()) ===

  get id(): string {
    return this._id;
  }

  get phoneCode(): string {
    return this.#phoneCode;
  }

  get phoneNumber(): string {
    return this.#phoneNumber;
  }

  get hidden(): boolean {
    return this.#hidden;
  }
}
