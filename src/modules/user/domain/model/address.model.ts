import { randomUUID } from "crypto";
import { BaseDomain } from "../../../../shared/models/base-domain";

export class Address extends BaseDomain<string> {
  // 🔒 TRUE private fields
  #addressLine1: string;
  #addressLine2?: string;
  #addressLine3?: string;
  #hometown: string;
  #zipCode: string;
  #state: string;
  #district: string;
  #country: string;

  constructor(
    protected _id: string,
    addressLine1: string,
    addressLine2: string | undefined = undefined,
    addressLine3: string | undefined = undefined,
    hometown: string,
    zipCode: string,
    state: string,
    district: string,
    country: string,
  ) {
    super(_id);

    this.#addressLine1 = addressLine1;
    this.#addressLine2 = addressLine2;
    this.#addressLine3 = addressLine3;
    this.#hometown = hometown;
    this.#zipCode = zipCode;
    this.#state = state;
    this.#district = district;
    this.#country = country;
  }

  static create(
    addressLine1: string,
    addressLine2: string | undefined,
    addressLine3: string | undefined,
    hometown: string,
    zipCode: string,
    state: string,
    district: string,
    country: string,
  ): Address {
    return new Address(
      randomUUID(),
      addressLine1,
      addressLine2,
      addressLine3,
      hometown,
      zipCode,
      state,
      district,
      country,
    );
  }

  public update(detail: Address) {
    this.#addressLine1 = detail.addressLine1;
    this.#addressLine2 = detail.addressLine2;
    this.#addressLine3 = detail.addressLine3;
    this.#hometown = detail.hometown;
    this.#zipCode = detail.zipCode;
    this.#state = detail.state;
    this.#district = detail.district;
    this.#country = detail.country;

    this.touch();
    return this;
  }

  // === Getters (required for BaseDomain.toJson()) ===

  get addressLine1(): string {
    return this.#addressLine1;
  }

  get addressLine2(): string | undefined {
    return this.#addressLine2;
  }

  get addressLine3(): string | undefined {
    return this.#addressLine3;
  }

  get hometown(): string {
    return this.#hometown;
  }

  get zipCode(): string {
    return this.#zipCode;
  }

  get state(): string {
    return this.#state;
  }

  get district(): string {
    return this.#district;
  }

  get country(): string {
    return this.#country;
  }
}
