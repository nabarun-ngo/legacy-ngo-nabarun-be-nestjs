import { applyDecorators,SetMetadata } from "@nestjs/common";
import { ApiExtension } from "@nestjs/swagger";

export const PERMISSIONS_KEY = "permissions";
export const REQUIRE_ALL_KEY = "requireAll";

export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    ApiExtension("x-required-permissions", permissions),
  );

export const RequireAllPermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(REQUIRE_ALL_KEY, true),
    ApiExtension("x-required-permissions", permissions),
    ApiExtension("x-require-all-permissions", true),
  );
