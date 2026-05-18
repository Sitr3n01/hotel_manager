import "server-only";
import type { Prisma, UserProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { findOverlappingReservation } from "@/lib/availability";
import {
  preReservationPayloadSchema,
  type PreReservationPayload,
} from "@/lib/validations/sync-operation";
import type { SyncOperation } from "@/lib/validations/sync-operation";
import type { SyncResult } from "../types";
import { buildSyncedOperationData, recordSyncRejection } from "../idempotency";
import { ConflictError } from "../errors";

export async function handlePreReservation(
  op: SyncOperation,
  user: UserProfile,
): Promise<SyncResult> {
  if (op.operationType !== "PRE_RESERVATION_CREATE") {
    return recordSyncRejection({
      op, user, entity: "Reservation",
      result: "FAILED", reason: "Tipo de operação inválido",
    });
  }
  if (!hasPermission(user, "RESERVATIONS_CREATE")) {
    return recordSyncRejection({
      op, user, entity: "Reservation",
      result: "CONFLICT", reason: "Usuário perdeu permissão para criar reservas",
    });
  }

  const parsed = preReservationPayloadSchema.safeParse(op.payload);
  if (!parsed.success) {
    return recordSyncRejection({
      op, user, entity: "Reservation",
      result: "FAILED", reason: "Payload de pré-reserva inválido",
    });
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const created = await createReservationInTx(tx, parsed.data, op.idempotencyKey, user.id);
    await tx.syncedOperation.create({
      data: buildSyncedOperationData({
        op, user, entity: "Reservation",
        entityId: created.id, errorMessage: null, result: "APPLIED",
      }),
    });
    return created;
  });

  await logAudit({
    actorId: user.id,
    action: "OFFLINE_SYNC_APPLIED",
    entity: "Reservation",
    entityId: reservation.id,
    afterData: reservation,
    metadata: { operationType: "PRE_RESERVATION_CREATE", idempotencyKey: op.idempotencyKey },
  });

  return { status: "APPLIED", idempotencyKey: op.idempotencyKey, entityId: reservation.id };
}

async function createReservationInTx(
  tx: Prisma.TransactionClient,
  payload: PreReservationPayload,
  idempotencyKey: string,
  userId: string,
) {
  const room = await tx.room.findUnique({
    where: { id: payload.roomId },
    include: { roomType: true },
  });
  if (!room || !room.isActive) {
    throw new ConflictError("Quarto inativo ou inexistente");
  }
  const totalPeople = payload.adults + payload.children;
  if (totalPeople > room.roomType.maxCapacity) {
    throw new ConflictError(
      `Capacidade excedida (${room.roomType.maxCapacity} pessoas no máximo para este tipo)`,
    );
  }

  const checkInDate = new Date(payload.checkInDate);
  const checkOutDate = new Date(payload.checkOutDate);
  const overlap = await findOverlappingReservation({
    roomId: payload.roomId,
    checkInDate,
    checkOutDate,
  });
  if (overlap) {
    throw new ConflictError(
      "Quarto já foi reservado para este período por outro usuário",
    );
  }

  const guestId = await resolveGuestId(tx, payload);
  return tx.reservation.create({
    data: {
      guestId,
      roomId: payload.roomId,
      checkInDate,
      checkOutDate,
      adults: payload.adults,
      children: payload.children,
      dailyRate: payload.dailyRate,
      discountAmount: payload.discountAmount,
      notes: payload.notes ?? null,
      status: "PRE_RESERVED",
      createdById: userId,
      idempotencyKey,
      origin: "OFFLINE_SYNC",
    },
  });
}

async function resolveGuestId(
  tx: Prisma.TransactionClient,
  payload: PreReservationPayload,
): Promise<string> {
  if (payload.guestId) {
    const existing = await tx.guest.findUnique({ where: { id: payload.guestId } });
    if (existing) return existing.id;
  }
  if (!payload.guestName) {
    throw new ConflictError("Hóspede inválido (sem id e sem nome)");
  }
  const created = await tx.guest.create({
    data: {
      name: payload.guestName,
      phone: payload.guestPhone ?? null,
      document: payload.guestDocument ?? null,
    },
  });
  return created.id;
}
