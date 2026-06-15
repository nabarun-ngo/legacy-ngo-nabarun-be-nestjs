import {
CanActivate,
ExecutionContext,
Injectable,
Logger,
UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { Configkey } from "src/shared/config-keys";

@Injectable()
export class FathomWebhookGuard implements CanActivate {
  private readonly logger = new Logger(FathomWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const webhookId = request.headers["webhook-id"];
    const webhookTimestamp = request.headers["webhook-timestamp"];
    const webhookSignature = request.headers["webhook-signature"];

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      this.logger.warn("Missing required Fathom webhook headers");
      throw new UnauthorizedException("Missing required headers");
    }

    // Verify timestamp (within 5 minutes)
    const timestamp = parseInt(webhookTimestamp as string, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > 300) {
      this.logger.warn(
        `Webhook timestamp out of acceptable range. TS: ${timestamp}, Current: ${currentTimestamp}`,
      );
      throw new UnauthorizedException("Timestamp validation failed");
    }

    // Get the raw body
    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error(
        "Raw body is not available on the request. Make sure bodyParser is configured correctly.",
      );
      throw new UnauthorizedException("Raw body missing");
    }

    const secret = process.env[Configkey.FATHOM_WEBHOOK_SECRET];
    if (!secret) {
      this.logger.error("FATHOM_WEBHOOK_SECRET is not configured");
      throw new UnauthorizedException("Webhook secret not configured");
    }

    try {
      // Construct signed content
      const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody.toString()}`;

      // Base64 decode the secret (part after whsec_ if applicable, else just use the secret)
      let secretBytes: Buffer;
      if (secret.startsWith("whsec_")) {
        secretBytes = Buffer.from(secret.split("_")[1], "base64");
      } else {
        // Fallback if the secret does not have 'whsec_' prefix (e.g. testing)
        secretBytes = Buffer.from(secret, "base64");
      }

      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac("sha256", secretBytes)
        .update(signedContent)
        .digest("base64");

      // Extract signatures from header (remove version prefixes)
      const signatures = (webhookSignature as string).split(" ").map((sig) => {
        const parts = sig.split(",");
        return parts.length > 1 ? parts[1] : parts[0];
      });

      // Constant-time comparison
      const isValid = signatures.some((sig) => {
        try {
          const sigBuffer = Buffer.from(sig);
          const expectedBuffer = Buffer.from(expectedSignature);
          if (sigBuffer.length !== expectedBuffer.length) return false;
          return crypto.timingSafeEqual(expectedBuffer, sigBuffer);
        } catch (err) {
          return false;
        }
      });

      if (!isValid) {
        this.logger.warn("Webhook signature verification failed");
        throw new UnauthorizedException("Invalid signature");
      }

      return true;
    } catch (error) {
      this.logger.error(`Error verifying webhook signature: ${error.message}`);
      throw new UnauthorizedException("Signature verification failed");
    }
  }
}
