import { SetMetadata } from "@nestjs/common";

export const IGNORE_CAPTCHA = "isIgnoreCaptcha";

export const IgnoreCaptchaValidation = (): MethodDecorator => {
  return (target, key, descriptor) => {
    SetMetadata(IGNORE_CAPTCHA, true)(target, key, descriptor);
  };
};
