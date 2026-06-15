import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { Configkey } from "src/shared/config-keys";

//TODO: Do not export this, Only allow to use it within the module
export const FIREBASE_ADMIN = Symbol("FIREBASE_ADMIN");

@Module({
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const serviceAccount = config.get<string>(
          Configkey.FIREBASE_CREDENTIAL,
        )!;
        return admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
          storageBucket: config.get<string>(
            Configkey.FIREBASE_FILESTORAGE_BUCKET,
          ),
        });
      },
    },
  ],
  exports: [FIREBASE_ADMIN],
})
// TODO: Do Not export Core Module Keep it locally inside Firebase Module
export class FirebaseCoreModule {}
