import "server-only";
import { Prisma, type UserProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { applyMovement } from "@/lib/actions/stock-movement";
import { canRegisterPurchase } from "@/lib/permissions";
import { purchaseSchema } from "@/lib/validations/stock-movement";
import { unitCostFromBatch } from "@/lib/inventory/cost";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncResult } from "../types";
import { buildSyncedOperationData, recordSyncRejection } from "../idempotency";

// Purchase is multi-item but offline-aware as ONE batch operation. We apply
// all items inside a single transaction and persist a single SyncedOperation
// row tagged with the batch's idempotencyKey. The first item's resulting
// movement.id is used as entityId for traceability.
export async function handleStockPurchase(
  op: SyncOperation,
  user: UserProfile,
): Promise<SyncResult> {
  if (op.operationType !== "STOCK_PURCHASE_CREATE") {
    return recordSyncRejection({
      op, user, entity: "StockMovement",
      result: "FAILED", reason: "Tipo de operação inválido",
    });
  }
  if (!canRegisterPurchase(user)) {
    return recordSyncRejection({
      op, user, entity: "StockMovement",
      result: "CONFLICT", reason: "Usuário perdeu permissão para registrar compras",
    });
  }

  const parsed = purchaseSchema.safeParse(op.payload);
  if (!parsed.success) {
    return recordSyncRejection({
      op, user, entity: "StockMovement",
      result: "FAILED", reason: "Payload de compra inválido",
    });
  }

  const firstMovement = await prisma.$transaction(async (tx) => {
    let first: { id: string } | null = null;
    for (const [index, item] of parsed.data.items.entries()) {
      const unitCost = unitCostFromBatch(item.totalCost, item.quantity);
      const created = await applyMovement(tx, {
        productId: item.productId,
        type: "IN",
        quantity: new Prisma.Decimal(item.quantity),
        unitCostForIn: unitCost,
        reason: parsed.data.reason || null,
        createdById: user.id,
        // Only the first item carries the batch's idempotencyKey (since the
        // column is UNIQUE on StockMovement and we have N rows here).
        idempotencyKey: index === 0 ? op.idempotencyKey : undefined,
        origin: "OFFLINE_SYNC",
      });
      if (!first) first = created;
    }

    if (!first) throw new Error("Compra sem itens válidos");

    await tx.syncedOperation.create({
      data: buildSyncedOperationData({
        op, user, entity: "StockMovement",
        entityId: first.id, errorMessage: null, result: "APPLIED",
      }),
    });
    return first;
  });

  await logAudit({
    actorId: user.id,
    action: "OFFLINE_SYNC_APPLIED",
    entity: "StockMovement",
    entityId: firstMovement.id,
    metadata: {
      operationType: "STOCK_PURCHASE_CREATE",
      idempotencyKey: op.idempotencyKey,
      items: parsed.data.items.length,
    },
  });

  return { status: "APPLIED", idempotencyKey: op.idempotencyKey, entityId: firstMovement.id };
}
