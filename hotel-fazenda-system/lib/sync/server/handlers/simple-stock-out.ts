import "server-only";
import { Prisma, type MovementType, type UserProfile } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { applyMovement } from "@/lib/actions/stock-movement";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncResult } from "../types";
import { buildSyncedOperationData, recordSyncRejection } from "../idempotency";
import { assertStockAvailable, loadActiveProduct } from "../guards/stock";

// Shared template for outbound stock movements registered offline (waste,
// internal consumption). Both follow the same pipeline:
// (1) verify operationType (2) verify permission (3) zod parse payload
// (4) tx: load active product, assert stock, applyMovement, record sync
// (5) audit. Concrete handlers only pass the discriminators.
type SimpleStockOutSchema = {
  safeParse: (input: unknown) =>
    | { success: true; data: { productId: string; quantity: number; reason?: string | null } }
    | { success: false; error: z.ZodError };
};

export async function runSimpleStockOut(args: {
  op: SyncOperation;
  user: UserProfile;
  expectedType: SyncOperation["operationType"];
  movementType: MovementType;
  permission: boolean;
  permissionDeniedReason: string;
  payloadSchema: SimpleStockOutSchema;
  invalidPayloadReason: string;
  auditOpType: string;
}): Promise<SyncResult> {
  const { op, user } = args;
  if (op.operationType !== args.expectedType) {
    return recordSyncRejection({
      op, user, entity: "StockMovement",
      result: "FAILED", reason: "Tipo de operação inválido",
    });
  }
  if (!args.permission) {
    return recordSyncRejection({
      op, user, entity: "StockMovement",
      result: "CONFLICT", reason: args.permissionDeniedReason,
    });
  }

  const parsed = args.payloadSchema.safeParse(op.payload);
  if (!parsed.success) {
    return recordSyncRejection({
      op, user, entity: "StockMovement",
      result: "FAILED", reason: args.invalidPayloadReason,
    });
  }

  const movement = await prisma.$transaction(async (tx) => {
    const product = await loadActiveProduct(tx, parsed.data.productId);
    const quantity = new Prisma.Decimal(parsed.data.quantity);
    assertStockAvailable(product.currentStock, quantity, product.name);

    const created = await applyMovement(tx, {
      productId: parsed.data.productId,
      type: args.movementType,
      quantity,
      reason: parsed.data.reason ?? null,
      createdById: user.id,
      idempotencyKey: op.idempotencyKey,
      origin: "OFFLINE_SYNC",
    });
    await tx.syncedOperation.create({
      data: buildSyncedOperationData({
        op, user, entity: "StockMovement",
        entityId: created.id, errorMessage: null, result: "APPLIED",
      }),
    });
    return created;
  });

  await logAudit({
    actorId: user.id,
    action: "OFFLINE_SYNC_APPLIED",
    entity: "StockMovement",
    entityId: movement.id,
    afterData: movement,
    metadata: { operationType: args.auditOpType, idempotencyKey: op.idempotencyKey },
  });

  return { status: "APPLIED", idempotencyKey: op.idempotencyKey, entityId: movement.id };
}
