import { createParamDecorator,ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../../domain/models/api-user.model";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const UserPermissions = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.permissions || [];
  },
);
