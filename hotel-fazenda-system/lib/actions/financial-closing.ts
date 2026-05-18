"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  canCloseReservation,
  canEditPaymentStatus,
  canReopenClosing,
  canViewFinancial,
  hasPermission,
} from "@/lib/permissions";
import {
  financialClosingServerSchema,
  reopenClosingSchema,
  type FinancialClosingInput,
  type ReopenClosingInput,
} from "@/lib/validations/financial-closing";
import {
  buildClosingData,
  calculateTotals,
  closingInclude,
  reservationForClosingInclude,
  reservationInclude,
  toClosingDetail,
  toClosingListItem,
  toDraftClosingDetail,
  validateClosingReservation,
  validateDiscountJustification,
  type ReservationForClosing,
} from "@/lib/actions/financial-closing-data";
import type {
  ClosingSummary,
  FinancialClosingDetail,
  FinancialClosingListItem,
  PendingClosingReservation,
} from "./financial-closing-types";

export type {
  ClosingSummary,
  FinancialClosingDetail,
  FinancialClosingListItem,
  PendingClosingReservation,
} from "./financial-closing-types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type ListClosingParams = {
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
};

export async function listFinancialClosings(
  params: ListClosingParams = {},
): Promise<FinancialClosingListItem[]> {
  const user = await getCurrentUser();
  if (!user || !canViewFinancial(user)) return [];

  const closings = await prisma.financialClosing.findMany({
    where: buildClosingWhere(params),
    include: { reservation: { include: { guest: true, room: true } } },
    orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
  });

  return closings.map(toClosingListItem);
}

export async function getClosingSummary(
  params: Omit<ListClosingParams, "paymentStatus"> = {},
): Promise<ClosingSummary> {
  const user = await getCurrentUser();
  if (!user || !canViewFinancial(user)) {
    return { pendingTotal: 0, partialTotal: 0, paidTotal: 0, grandTotal: 0 };
  }

  const rows = await prisma.financialClosing.findMany({
    where: buildClosingWhere(params),
    select: { paymentStatus: true, finalTotal: true },
  });

  return rows.reduce(
    (summary, closing) => addToSummary(summary, closing.paymentStatus, closing.finalTotal),
    { pendingTotal: 0, partialTotal: 0, paidTotal: 0, grandTotal: 0 },
  );
}

export async function listReservationsReadyForClosing(): Promise<PendingClosingReservation[]> {
  const user = await getCurrentUser();
  if (!user || !canViewFinancial(user)) return [];

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
      closing: null,
    },
    include: reservationInclude,
    orderBy: { checkOutDate: "asc" },
  });

  return reservations.map((reservation) => {
    const totals = calculateTotals(reservation);
    return {
      id: reservation.id,
      guestName: reservation.guest.name,
      roomName: reservation.room.name,
      roomNumber: reservation.room.number,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      status: reservation.status,
      estimatedTotal: totals.finalTotal.toNumber(),
    };
  });
}

export async function getFinancialClosingDetail(
  id: string,
): Promise<FinancialClosingDetail | null> {
  const user = await getCurrentUser();
  if (!user || !canViewFinancial(user)) return null;

  const closing = await prisma.financialClosing.findUnique({
    where: { id },
    include: closingInclude,
  });
  if (closing) return toClosingDetail(closing);

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: reservationInclude,
  });
  return reservation ? toDraftClosingDetail(reservation) : null;
}

export async function upsertFinancialClosing(
  input: FinancialClosingInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canCloseReservation(user)) {
    return { success: false, error: "Sem permissão para fechar reservas" };
  }

  const parsed = financialClosingServerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const permissionError = validateClosingPermissions(user, parsed.data);
  if (permissionError) return permissionError;

  const reservation = await prisma.reservation.findUnique({
    where: { id: parsed.data.reservationId },
    include: reservationForClosingInclude,
  });
  const reservationError = validateClosingReservation(reservation);
  if (reservationError) return reservationError;
  const editableReservation = reservation as ReservationForClosing;

  const totals = calculateTotals(editableReservation, parsed.data);
  const discountError = validateDiscountJustification(parsed.data, totals.dailyTotal);
  if (discountError) return discountError;

  const data = buildClosingData(parsed.data, totals);
  const closing = await prisma.financialClosing.upsert({
    where: { reservationId: editableReservation.id },
    create: { reservationId: editableReservation.id, ...data },
    update: data,
  });

  await logAudit({
    actorId: user.id,
    action: editableReservation.closing ? "UPDATE" : "CREATE",
    entity: "FinancialClosing",
    entityId: closing.id,
    metadata: { reservationId: editableReservation.id },
  });

  revalidateFinancialPaths(closing.id);
  return { success: true, data: { id: closing.id } };
}

export async function finalizeClosing(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canCloseReservation(user)) {
    return { success: false, error: "Sem permissão para finalizar fechamento" };
  }

  const before = await prisma.financialClosing.findUnique({
    where: { id },
    include: { reservation: true },
  });
  if (!before) return { success: false, error: "Fechamento não encontrado" };
  if (before.closedAt) return { success: true, data: { id: before.id } };
  if (!["CHECKED_IN", "CHECKED_OUT"].includes(before.reservation.status)) {
    return { success: false, error: "A reserva precisa estar em hospedagem ou check-out" };
  }

  const closing = await prisma.$transaction(async (tx) => {
    const updated = await tx.financialClosing.update({
      where: { id },
      data: { closedAt: new Date(), closedById: user.id },
    });
    if (before.reservation.status === "CHECKED_IN") {
      await tx.reservation.update({
        where: { id: before.reservationId },
        data: { status: "CHECKED_OUT" },
      });
      await tx.room.update({
        where: { id: before.reservation.roomId },
        data: { status: "CLEANING" },
      });
    }
    return updated;
  });

  await logAudit({
    actorId: user.id,
    action: "CLOSE",
    entity: "FinancialClosing",
    entityId: closing.id,
    beforeData: { closedAt: before.closedAt },
    afterData: { closedAt: closing.closedAt },
  });

  revalidateFinancialPaths(closing.id);
  revalidatePath("/reservas");
  revalidatePath("/quartos");
  return { success: true, data: { id: closing.id } };
}

export async function reopenClosing(
  id: string,
  input: ReopenClosingInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canReopenClosing(user)) {
    return { success: false, error: "Sem permissão para reabrir fechamento" };
  }

  const parsed = reopenClosingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.financialClosing.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Fechamento não encontrado" };

  const closing = await prisma.financialClosing.update({
    where: { id },
    data: { closedAt: null, closedById: null },
  });

  await logAudit({
    actorId: user.id,
    action: "REOPEN",
    entity: "FinancialClosing",
    entityId: closing.id,
    beforeData: { closedAt: before.closedAt },
    afterData: { closedAt: null },
    metadata: { reason: parsed.data.reason },
  });

  revalidateFinancialPaths(closing.id);
  return { success: true, data: { id: closing.id } };
}

export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
  paymentMethod: PaymentMethod | null,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canEditPaymentStatus(user)) {
    return { success: false, error: "Sem permissão para alterar pagamento" };
  }

  const before = await prisma.financialClosing.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Fechamento não encontrado" };

  const closing = await prisma.financialClosing.update({
    where: { id },
    data: { paymentStatus, paymentMethod },
  });

  await logAudit({
    actorId: user.id,
    action: "PAYMENT_STATUS",
    entity: "FinancialClosing",
    entityId: closing.id,
    beforeData: {
      paymentStatus: before.paymentStatus,
      paymentMethod: before.paymentMethod,
    },
    afterData: { paymentStatus, paymentMethod },
  });

  revalidateFinancialPaths(closing.id);
  return { success: true, data: { id: closing.id } };
}

function buildClosingWhere(params: ListClosingParams): Prisma.FinancialClosingWhereInput {
  return {
    ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
    ...(params.from || params.to
      ? { closedAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
      : {}),
  };
}

function addToSummary(
  summary: ClosingSummary,
  status: PaymentStatus,
  finalTotal: Prisma.Decimal,
): ClosingSummary {
  const value = finalTotal.toNumber();
  if (status === "PENDING") summary.pendingTotal += value;
  if (status === "PARTIAL") summary.partialTotal += value;
  if (status === "PAID") summary.paidTotal += value;
  summary.grandTotal += value;
  return summary;
}

function validateClosingPermissions(
  user: CurrentUser,
  input: FinancialClosingInput,
): ActionResult<{ id: string }> | null {
  const hasDiscount = new Prisma.Decimal(input.discountTotal).gt(0);
  const hasExtra = new Prisma.Decimal(input.extraTotal).gt(0);

  if (hasDiscount && !hasPermission(user, "FINANCIAL_APPLY_DISCOUNT")) {
    return { success: false, error: "Sem permissão para aplicar desconto" };
  }
  if (hasExtra && !hasPermission(user, "FINANCIAL_APPLY_EXTRA")) {
    return { success: false, error: "Sem permissão para aplicar valor extra" };
  }
  return null;
}

function revalidateFinancialPaths(id: string) {
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${id}`);
}
