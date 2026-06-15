import { HttpService } from "@nestjs/axios";
import { Inject,Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { FirebaseStorageService } from "../../../firebase/storage/firebase-storage.service";
import { Document } from "../../domain/document.model";
import {
DOCUMENT_REPOSITORY,
type IDocumentRepository,
} from "../../domain/document.repository.interface";
import {
DocumentMapping,
DocumentMappingRefType,
} from "../../domain/mapping.model";
import { toDocumentDto } from "../../presentation/dms-sto-mapper";
import { DmsUploadDto } from "../../presentation/dto/dms-upload.dto";
import { DocumentDto } from "../../presentation/dto/document.dto";

@Injectable()
export class DmsService {
  constructor(
    private readonly firebaseStorage: FirebaseStorageService,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    private readonly httpService: HttpService,
  ) {}

  async uploadFile(
    body: DmsUploadDto,
    authUserId: string,
  ): Promise<DocumentDto> {
    const content = Buffer.from(body.fileBase64, "base64");
    const mapped: DocumentMapping[] = body.documentMapping.map((mapping) =>
      DocumentMapping.create({
        refId: mapping.entityId,
        refType: mapping.entityType,
      }),
    );

    const document = Document.create({
      fileName: body.filename,
      contentType: body.contentType,
      fileSize: content.length,
      isPublic: false,
      mappedTo: mapped,
      uploadedBy: { id: authUserId },
    });
    const url = await this.firebaseStorage.uploadFile(
      document.remotePath,
      document.contentType,
      document.publicToken,
      content,
    );
    await this.documentRepository.create(document);
    return { ...toDocumentDto(document), fileUrl: url };
  }

  async getDocuments(type: DocumentMappingRefType, id: string) {
    const documents = await this.documentRepository.findAll({
      refType: type,
      refId: id,
    });
    return documents.map((doc) => toDocumentDto(doc));
  }

  async deleteFile(id: string): Promise<void> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new BusinessException("Document not found");
    }
    await this.firebaseStorage.deleteFile(document.remotePath);
    await this.documentRepository.delete(id);
  }

  async getSignedUrl(id: string): Promise<string> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new BusinessException("Document not found");
    }
    return await this.firebaseStorage.getSignedUrl(document.remotePath);
  }

  async downloadFile(id: string): Promise<{
    fileName: string;
    contentType: string;
    stream: NodeJS.ReadableStream;
  }> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new BusinessException("Document not found");
    }
    return {
      fileName: document.fileName,
      stream: await this.firebaseStorage.downloadFile(document.remotePath),
      contentType: document.contentType,
    };
  }

  async getFileBuffer(
    id: string,
  ): Promise<{ fileName: string; buffer: Buffer; contentType: string }> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      throw new BusinessException("Document not found");
    }
    const url = await this.firebaseStorage.getSignedUrl(document.remotePath);
    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: "arraybuffer" }),
    );
    return {
      fileName: document.fileName,
      buffer: Buffer.from(response.data),
      contentType: document.contentType,
    };
  }
}
