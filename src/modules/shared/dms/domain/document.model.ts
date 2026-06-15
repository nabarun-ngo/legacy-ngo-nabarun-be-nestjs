import { randomUUID } from "crypto";
import { User } from "src/modules/user/domain/model/user.model";
import { AggregateRoot } from "src/shared/models/aggregate-root";
import { DocumentMapping,DocumentMappingRefType } from "./mapping.model";

export interface DocumentProps {
  refId: string;
  refType: DocumentMappingRefType;
}

export class Document extends AggregateRoot<string> {
  #id: string;
  #fileName: string;
  #remotePath: string;
  #publicToken: string;
  #contentType: string;
  #fileSize: number;
  #mappings: DocumentMapping[];
  #isPublic: boolean;
  #uploadedBy?: Partial<User>;

  constructor(
    id: string,
    fileName: string,
    remotePath: string,
    publicToken: string,
    contentType: string,
    fileSize: number,
    mappings: DocumentMapping[],
    isPublic: boolean,
    uploadedBy?: Partial<User>,
    createdAt?: Date,
  ) {
    super(id, createdAt);
    this.#id = id;
    this.#fileName = fileName;
    this.#remotePath = remotePath;
    this.#publicToken = publicToken;
    this.#contentType = contentType;
    this.#fileSize = fileSize;
    this.#mappings = mappings;
    this.#isPublic = isPublic;
    this.#uploadedBy = uploadedBy;
  }

  static create(params: {
    fileName: string;
    contentType: string;
    fileSize: number;
    isPublic: boolean;
    mappedTo: DocumentMapping[];
    uploadedBy?: Partial<User>;
  }) {
    return new Document(
      randomUUID(),
      params.fileName,
      "uploads/" + randomUUID() + "-" + params.fileName,
      randomUUID(),
      params.contentType,
      params.fileSize,
      params.mappedTo,
      params.isPublic,
      params.uploadedBy,
    );
  }

  addMapping(mapping: DocumentMapping) {
    this.#mappings.push(mapping);
    return mapping;
  }

  get fileName() {
    return this.#fileName;
  }
  get remotePath() {
    return this.#remotePath;
  }
  get publicToken() {
    return this.#publicToken;
  }
  get contentType() {
    return this.#contentType;
  }
  get fileSize() {
    return this.#fileSize;
  }

  get isPublic() {
    return this.#isPublic;
  }
  get uploadedBy() {
    return this.#uploadedBy;
  }

  get mappings(): ReadonlyArray<DocumentMapping> {
    return this.#mappings;
  }
}
