"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  canDeleteReservationConsumption,
  canRegisterReservationConsumption,
  canSeeFinancialValues,
} from "@/lib/permissions";
import {
  createConsumptionSchema,
  type CreateConsumptionInput,
} from "@/lib/validations/reservation-consumption";
import { isReservationTerminal } from "@/lib/reservation-status";
import { applyMovement } from "@/lib/actions/stock-movement";
import { createReservationConsumptionRow } from "@/lib/reservation-consumption-builder";
import { Prisma, type ReservationConsumption } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function listReservationsForConsumption() {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canRegisterReservationConsumption(user)) return [];

  return prisma.reservation.findMany({
    where: { status: { in: ["PRE_RESERVED", "CONFIRMED", "CHECKED_IN"] } },
    orderBy: [{ checkInDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      guest: { select: { id: true, name: true } },
      room: { select: { id: true, number: true, name: true } },
    },
  });
}

export async function listConsumptionsForReservation(reservationId: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canRegisterReservationConsumption(user) && !canSeeFinancialValues(user)) return [];

  const consumptions = await prisma.reservationConsumption.findMany({
    where: { reservationId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { id: true, name: true, unit: true, category: { select: { name: true } } },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (canSeeFinancialValues(user)) return consumptions;
  return consumptions.map((c) => ({
    ...c,
    unitPrice: new Prisma.Decimal(0),
    totalPrice: new Prisma.Decimal(0),
  }));
}

export async function createReservationConsumption(
  input: CreateConsumptionInput,
): Promise<ActionResult<ReservationConsumption>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canRegisterReservationConsumption(user)) {
    return { success: false, error: "Sem permissão para registrar consumo de hóspede" };
  }

  const parsed = createConsumptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const blocker = await blockIfReservationNotEditable(parsed.data.reservationId);
  if (blocker) return blocker;

  try {
    const consumption = await prisma.$transaction(async (tx) => {
      const created = await createReservationConsumptionRow(tx, parsed.data, {
        createdById: user.id,
      });

      if (parsed.data.productId) {
        await applyMovement(tx, {
          productId: parsed.data.productId,
          type: "RESERVATION_CONSUMPTION",
          quantity: new Prisma.Decimal(parsed.data.quantity),
          reservationId: parsed.data.reservationId,
          createdById: user.id,
        });
      }

      return created;
    });

    await logAudit({
      actorId: user.id,
      action: "CONSUMPTION_LOG",
      entity: "ReservationConsumption",
      entityId: consumption.id,
      afterData: consumption,
      metadata: { reservationId: parsed.data.reservationId },
    });
    revalidatePath("/cozinha");
    revalidatePath(`/reservas/${parsed.data.reservationId}`);
    revalidatePath("/reservas");
    return { success: true, data: consumption };
  } catch (error) {
    return toConsumptionError(error);
  }
}

export async function deleteReservationConsumption(
  id: string,
): Promise<ActionResult<ReservationConsumption>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canDeleteReservationConsumption(user)) {
    return { success: false, error: "Sem permissão para excluir consumo" };
  }

  const before = await prisma.reservationConsumption.findUnique({
    where: { id },
    include: { reservation: true },
  });
  if (!before) return { success: false, error: "Consumo não encontrado" };

  const blocker = await blockIfReservationNotEditable(before.reservationId);
  if (blocker) return blocker;

  try {
    await prisma.$transaction(async (tx) => {
      if (before.productId) {
        await applyMovement(tx, {
          productId: before.productId,
          type: "POSITIVE_ADJUSTMENT",
          quantity: before.quantity,
          reason: `Estorno consumo ${before.id}`,
          createdById: user.id,
        });
      }
      await tx.reservationConsumption.delete({ where: { id } });
    });

    await logAudit({
      actorId: user.id,
      action: "CONSUMPTION_REVERSE",
      entity: "ReservationConsumption",
      entityId: id,
      beforeData: before,
      metadata: { reservationId: before.reservationId },
    });
    revalidatePath("/cozinha");
    revalidatePath(`/reservas/${before.reservationId}`);
    revalidatePath("/reservas");
    return { success: true, data: before };
  } catch (error) {
    return toConsumptionError(error);
  }
}

async function blockIfReservationNotEditable(
  reservationId: string,
): Promise<ActionResult<never> | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { closing: true },
  });
  if (!reservation) return { success: false, error: "Reserva não encontrada" };
  if (isReservationTerminal(reservation.status) && reservation.status !== "CHECKED_OUT") {
    return { success: false, error: "Reserva cancelada/no-show não aceita consumo" };
  }
  if (reservation.closing?.closedAt) {
    return { success: false, error: "Reserva já fechada não aceita alteração de consumo" };
  }
  return null;
}

function toConsumptionError(error: unknown): ActionResult<never> {
  if (error instanceof Error && error.message) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Não foi possível registrar o consumo." };
}
