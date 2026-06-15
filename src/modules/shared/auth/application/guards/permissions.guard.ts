import {
CanActivate,
ExecutionContext,
ForbiddenException,
Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
PERMISSIONS_KEY,
REQUIRE_ALL_KEY,
} from "../decorators/require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const requireAll =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_ALL_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    const request = context.switchToHttp().getRequest();
    const userPermissions: string[] = request.user.permissions || [];

    const hasPermission = requireAll
      ? requiredPermissions.every((permission) =>
          userPermissions.includes(permission),
        )
      : requiredPermissions.some((permission) =>
          userPermissions.includes(permission),
        );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
