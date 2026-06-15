import { INestApplication } from "@nestjs/common";
import { DocumentBuilder,SwaggerModule } from "@nestjs/swagger";
import { Configkey } from "src/shared/config-keys";
import { PagedResult } from "src/shared/models/paged-result";
import {
ErrorResponse,
SuccessResponse,
} from "src/shared/models/response-model";
// DTOs used widely as output models
import {
AddressDto,
LinkDto,
PhoneNumberDto,
RoleDto,
UserDto,
} from "src/modules/user/application/dto/user.dto";
// Add more DTO imports as needed

export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle(process.env[Configkey.APP_NAME] || "API Documentation")
    .setDescription(
      `${process.env[Configkey.APP_NAME]} Backend API powered by NestJS`,
    )
    .setVersion("2.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "jwt",
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "API Key needed to access the endpoints",
      },
      "api-key",
    )
    .build();

  // Register extra models so they appear in the generated OpenAPI doc even if only referenced generically
  // The Swagger plugin will automatically infer types from method signatures, but we need to register
  // commonly used models here for generic types like SuccessResponse<T> and PagedResult<T>
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      SuccessResponse,
      ErrorResponse,
      PagedResult,
      // User-related DTOs
      UserDto,
      PhoneNumberDto,
      AddressDto,
      LinkDto,
      RoleDto,
      // Add more DTOs as they are used in controllers
      // The @ApiAutoResponse decorator will automatically register models via @ApiExtraModels
    ],
    // Enable deep scan for better type inference
    deepScanRoutes: true,
    autoTagControllers: true,
    // Custom operation ID factory
    operationIdFactory: (controllerKey: string, methodKey: string) => {
      // List of common method names that might cause collisions if used alone
      // const commonMethods = ['create', 'update', 'delete', 'remove', 'get', 'list', 'listSelf', 'getById', 'updateSelf', 'detail'];
      // console.log(controllerKey, methodKey);
      // let operationId;
      // if (commonMethods.includes(methodKey)) {
      //   // Prepend controller name for common methods to ensure uniqueness
      //   // e.g. DonationController.create -> donationCreate
      //   const cleanControllerName = controllerKey.replace(/Controller$/, '');
      //   operationId = cleanControllerName.charAt(0).toLowerCase() + cleanControllerName.slice(1) + methodKey.charAt(0).toUpperCase() + methodKey.slice(1);
      // } else {
      //   // For specific/unique methods, use the method name as is (capitalized)
      //   // e.g. DonationController.getSelfDonations -> GetSelfDonations
      //   operationId = methodKey.charAt(0).toUpperCase() + methodKey.slice(1);
      // }
      return methodKey.charAt(0).toUpperCase() + methodKey.slice(1);
    },
  });

  // Post-process document to add permissions to description
  Object.values(document.paths).forEach((pathItem) => {
    Object.keys(pathItem).forEach((method) => {
      // only process http methods
      if (
        ["get", "post", "put", "delete", "patch", "options", "head"].includes(
          method,
        )
      ) {
        const operation: any = pathItem[method];
        if (operation && operation["x-required-permissions"]) {
          const permissions = operation["x-required-permissions"] as string[];
          const requireAll = operation["x-require-all-permissions"] === true;

          if (Array.isArray(permissions) && permissions.length > 0) {
            const permissionList = permissions
              .map((p) => `- \`${p}\``)
              .join("\n");
            const suffix = requireAll
              ? "\n_(All permissions required)_"
              : "\n_(Any of these permissions)_";

            const permissionText = `\n\n**Required Permissions:**\n${permissionList}${suffix}`;

            operation.description =
              (operation.description || "") + permissionText;
          }
        }
      }
    });
  });

  SwaggerModule.setup("swagger-ui", app, document, {
    jsonDocumentUrl: "api/docs",
  });
}
