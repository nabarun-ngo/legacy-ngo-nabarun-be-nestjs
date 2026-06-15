import { randomUUID } from "crypto";
import { BaseDomain } from "src/shared/models/base-domain";

export enum DocumentMappingRefType {
  DONATION = "DONATION",
  PROFILE = "PROFILE",
  TRANSACTION = "TRANSACTION",
  EXPENSE = "EXPENSE",
  EARNING = "EARNING",
  REPORT = "REPORT",
}

export class DocumentMapping extends BaseDomain<string> {
  #id: string;
  #refId: string;
  #refType: DocumentMappingRefType;

  constructor(
    id: string,
    refId: string,
    refType: DocumentMappingRefType,
    createdAt?: Date,
  ) {
    super(id, createdAt);
    this.#id = id;
    this.#refId = refId;
    this.#refType = refType;
  }

  static create(params: { refId: string; refType: DocumentMappingRefType }) {
    return new DocumentMapping(
      randomUUID(),
      params.refId,
      params.refType,
      new Date(),
    );
  }

  get refId() {
    return this.#refId;
  }
  get refType() {
    return this.#refType;
  }
}
