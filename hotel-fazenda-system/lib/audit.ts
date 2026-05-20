import "server-only";
import { prisma } from "@/lib/prisma";

type AuditEntity =
  | "RoomType"
  | "Room"
  | "Guest"
  | "Reservation"
  | "FinancialClosing"
  | "Product"
  | "ProductCategory"
  | "StockMovement"
  | "ReservationConsumption"
  | "SyncedOperation"
  | "UserProfile"
  | "PermissionTag"
  | "UserPermissionTag"
  | "AccessRequest";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DEACTIVATE"
  | "STATUS_CHANGE"
  | "CONFIRM"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "CANCEL"
  | "NO_SHOW"
  | "DELETE"
  | "CLOSE"
  | "REOPEN"
  | "DISCOUNT"
  | "EXTRA_CHARGE"
  | "PAYMENT_STATUS"
  | "PAYMENT_METHOD"
  | "EXPORT"
  | "STOCK_IN"
  | "WASTE"
  | "INTERNAL_CONSUMPTION"
  | "ADJUSTMENT_POSITIVE"
  | "ADJUSTMENT_NEGATIVE"
  | "CONSUMPTION_LOG"
  | "CONSUMPTION_REVERSE"
  | "OFFLINE_SYNC_APPLIED"
  | "OFFLINE_SYNC_CONFLICT"
  | "OFFLINE_SYNC_FAILED"
  | "ACCESS_REQUESTED"
  | "APPROVE"
  | "REJECT"
  | "BLOCK"
  | "REACTIVATE"
  | "ROLE_CHANGE"
  | "PERMISSION_GRANT"
  | "PERMISSION_REVOKE"
  | "PRESET_APPLY"
  | "ACCESS_DENIED"
  | "ACCESS_REQUEST_CREATE_FAILED"
  | "EXPORT_DENIED"
  | "EXPORT_NOT_FOUND";

type LogAuditParams = {
  actorId?: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
};

export async function logAudit(params: LogAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      beforeData: (params.beforeData as object) ?? undefined,
      afterData: (params.afterData as object) ?? undefined,
      metadata: (params.metadata as object) ?? undefined,
    },
  });
}
