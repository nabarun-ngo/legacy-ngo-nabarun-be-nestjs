import { HttpService } from "@nestjs/axios";
import { Injectable,Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private static readonly VERIFY_URL =
    "https://www.google.com/recaptcha/api/siteverify";
  private readonly recaptchaSecret: string;

  constructor(private readonly httpService: HttpService) {
    this.recaptchaSecret = process.env.GOOGLE_RECAPTCHA_SECURITY_KEY || "";
    if (!this.recaptchaSecret) {
      throw new Error(
        "Missing GOOGLE_RECAPTCHA_SECURITY_KEY in environment variables",
      );
    }
  }

  /**
   * Verifies the reCAPTCHA token with Google
   * @param token token generated on the frontend
   * @param action expected action (optional, can validate per route)
   * @param threshold score threshold (0-1)
   * @returns true if token is valid
   */
  async verifyToken(
    token: string,
    action?: string,
    threshold = 0.5,
  ): Promise<boolean> {
    // Harden threshold validation
    let validatedThreshold = threshold;
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      this.logger.warn(
        `Invalid reCAPTCHA threshold: ${threshold}. Using default 0.5`,
      );
      validatedThreshold = 0.5;
    }

    try {
      const params = new URLSearchParams();
      params.append("secret", this.recaptchaSecret);
      params.append("response", token);

      const response$ = this.httpService.post<RecaptchaResponse>(
        RecaptchaService.VERIFY_URL,
        params,
      );

      const { data } = await firstValueFrom(response$);

      if (!data.success) return false;
      if (typeof data.score === "number" && data.score < validatedThreshold)
        return false;
      if (action && data.action !== action) return false;

      return true;
    } catch (error) {
      this.logger.error("Error verifying reCAPTCHA", error);
      return false;
    }
  }
}
