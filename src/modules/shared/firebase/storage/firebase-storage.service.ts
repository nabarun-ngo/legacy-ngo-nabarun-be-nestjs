import { Inject,Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import * as querystring from "querystring";
import { FIREBASE_ADMIN } from "../firebase-core.module";

@Injectable()
export class FirebaseStorageService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly app: admin.app.App) {}

  async uploadFile(
    filePath: string,
    contentType: string,
    token: string,
    content: Buffer,
  ): Promise<string> {
    const bucket = this.app.storage().bucket();

    try {
      const file = bucket.file(filePath);
      await file.save(content, {
        metadata: {
          contentType: contentType,
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });

      const encodedBucket = querystring.escape(bucket.name);
      const encodedFileName = querystring.escape(filePath);
      const encodedToken = querystring.escape(token);

      return `https://firebasestorage.googleapis.com/v0/b/${encodedBucket}/o/${encodedFileName}?alt=media&token=${encodedToken}`;
    } catch (error) {
      throw new Error(`Firebase upload failed: ${(error as Error).message}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    const bucket = this.app.storage().bucket();
    const file = bucket.file(fileName);

    try {
      await file.delete();
    } catch (error) {
      throw new Error(`Firebase delete failed: ${(error as Error).message}`);
    }
  }

  async getSignedUrl(
    fileName: string,
    expireAfter: number = 15 * 60 * 1000,
  ): Promise<string> {
    const bucket = this.app.storage().bucket();
    const file = bucket.file(fileName);

    try {
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: new Date(Date.now() + expireAfter), // 15 minutes
      });
      return url;
    } catch (error) {
      throw new Error(
        `Firebase getSignedUrl failed: ${(error as Error).message}`,
      );
    }
  }

  async downloadFile(filePath: string): Promise<NodeJS.ReadableStream> {
    const bucket = this.app.storage().bucket();
    const file = bucket.file(filePath);

    const exists = await file.exists();
    if (!exists) {
      throw new Error("File not found");
    }

    const stream = file.createReadStream();

    stream.on("error", (error) => {
      console.error("Firebase stream error:", error);
      throw error;
    });

    return stream;
  }
}
