import "server-only";
import { Prisma, type UserProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { applyMovement } from "@/lib/actions/stock-movement";
import { canRegisterReservationConsumption } from "@/lib/permissions";
import { createConsumptionSchema } from "@/lib/validations/reservation-consumption";
import { createReservationConsumptionRow } from "@/lib/reservation-consumption-builder";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncResult } from "../types";
import { buildSyncedOperationData, recordSyncRejection } from "../idempotency";
import { loadEditableReservation } from "../guards/reservation";
import { assertStockAvailable, loadActiveProduct } from "../guards/stock";

export async function handleReservationConsumption(
  op: SyncOperation,
  user: UserProfile,
): Promise<SyncResult> {
  if (op.operationType !== "RESERVATION_CONSUMPTION_CREATE") {
    return recordSyncRejection({
      op, user, entity: "ReservationConsumption",
      result: "FAILED", reason: "Tipo de operação inválido",
    });
  }
  if (!canRegisterReservationConsumption(user)) {
    return recordSyncRejection({
      op, user, entity: "ReservationConsumption",
      result: "CONFLICT", reason: "Usuário perdeu permissão para registrar consumo de hóspede",
    });
  }

  const parsed = createConsumptionSchema.safeParse(op.payload);
  if (!parsed.success) {
    return recordSyncRejection({
      op, user, entity: "ReservationConsumption",
      result: "FAILED", reason: "Payload de consumo de hóspede inválido",
    });
  }

  const consumption = await prisma.$transaction(async (tx) => {
    await loadEditableReservation(tx, parsed.data.reservationId);
    const created = await createReservationConsumptionRow(tx, parsed.data, {
      createdById: user.id,
      idempotencyKey: op.idempotencyKey,
      origin: "OFFLINE_SYNC",
    });

    if (parsed.data.productId) {
      const product = await loadActiveProduct(tx, parsed.data.productId);
      const quantity = new Prisma.Decimal(parsed.data.quantity);
      assertStockAvailable(product.currentStock, quantity, product.name);
      await applyMovement(tx, {
        productId: parsed.data.productId,
        type: "RESERVATION_CONSUMPTION",
        quantity,
        reservationId: parsed.data.reservationId,
        createdById: user.id,
        // StockMovement.idempotencyKey deve ser distinto do da consumption
        // (mesma chave gravada em duas tabelas violaria unicidade cruzada de
        // negócio); deixamos undefined — a SyncedOperation já é o âncora.
        origin: "OFFLINE_SYNC",
      });
    }

    await tx.syncedOperation.create({
      data: buildSyncedOperationData({
        op, user, entity: "ReservationConsumption",
        entityId: created.id, errorMessage: null, result: "APPLIED",
      }),
    });
    return created;
  });

  await logAudit({
    actorId: user.id,
    action: "OFFLINE_SYNC_APPLIED",
    entity: "ReservationConsumption",
    entityId: consumption.id,
    afterData: consumption,
    metadata: {
      operationType: "RESERVATION_CONSUMPTION_CREATE",
      idempotencyKey: op.idempotencyKey,
      reservationId: parsed.data.reservationId,
    },
  });

  return { status: "APPLIED", idempotencyKey: op.idempotencyKey, entityId: consumption.id };
}
