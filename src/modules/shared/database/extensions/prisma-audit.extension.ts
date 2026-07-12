import { Prisma } from "@prisma/client";
import { config } from "src/config/app.config";
import { getTraceId, getUserContext } from "nestjs-shared/core";

export const prismaAuditExtension = Prisma.defineExtension((client) => {
  const auditedModels = config.database.auditedModels;

  return client.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          if (model === "AuditLog") return query(args);
          const result = await query(args);

          if (auditedModels.includes(model)) {
            await logAudit(
              client,
              model,
              (result as any).id,
              "CREATE",
              null,
              args.data,
            );
          }
          return result;
        },
        async update({ model, args, query }) {
          if (model === "AuditLog") return query(args);
          const result = await query(args);
          if (auditedModels.includes(model)) {
            const entityId = (args.where as any).id || (result as any).id;
            await logAudit(client, model, entityId, "UPDATE", null, args.data);
          }
          return result;
        },
        async upsert({ model, args, query }) {
          if (model === "AuditLog") return query(args);
          const result = await query(args);
          if (auditedModels.includes(model)) {
            const entityId = (result as any).id;
            const action =
              (result as any).createdAt === (result as any).updatedAt
                ? "CREATE"
                : "UPDATE";
            await logAudit(
              client,
              model,
              entityId,
              action,
              null,
              action === "CREATE" ? args.create : args.update,
            );
          }
          return result;
        },
        async delete({ model, args, query }) {
          if (model === "AuditLog") return query(args);
          if (auditedModels.includes(model)) {
            await logAudit(
              client,
              model,
              (args.where as any).id,
              "DELETE",
              null,
              null,
            );
          }
          return query(args);
        },
      },
    },
  });
});

async function logAudit(
  client: any,
  model: string,
  entityId: string,
  action: string,
  oldValues: any,
  newValues: any,
) {
  const userContext = getUserContext();
  const traceId = getTraceId();
  try {
    await client.auditLog.create({
      data: {
        entityType: model,
        entityId: entityId || "unknown",
        action: action,
        userId: userContext?.userId || "system",
        userName: userContext?.userName || "System",
        oldValues: oldValues || {},
        newValues: newValues || {},
        ipAddress: userContext?.ipAddress,
        userAgent: userContext?.userAgent,
        traceId: traceId,
      },
    });
  } catch (error) {
    console.error(`Failed to create audit log for ${model}:`, error);
  }
}
