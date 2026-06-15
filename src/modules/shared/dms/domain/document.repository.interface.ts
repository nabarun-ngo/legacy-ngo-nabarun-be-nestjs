import { IRepository } from "src/shared/interfaces/repository.interface";
import { Document,DocumentProps } from "./document.model";

export const DOCUMENT_REPOSITORY = Symbol("IDocumentRepository");

export interface IDocumentRepository
  extends IRepository<Document, string, DocumentProps> {
  findAll(filter: DocumentProps): Promise<Document[]>;
}
