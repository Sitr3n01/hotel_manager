import { Prisma } from "@prisma/client";
import {
  calculateConsumptionTotal,
  calculateDailyTotal,
  calculateFinalTotal,
  calculateNights,
} from "@/lib/financial-calculations";
import type { FinancialClosingInput } from "@/lib/validations/financial-closing";
import type { FinancialClosingDetail, FinancialClosingListItem } from "./financial-closing-types";

type ClosingSaveResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export const reservationInclude = {
  guest: true,
  room: true,
  consumptions: { include: { product: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.ReservationInclude;

export const closingInclude = {
  reservation: { include: reservationInclude },
  closedBy: true,
} satisfies Prisma.FinancialClosingInclude;

export const reservationForClosingInclude = {
  ...reservationInclude,
  closing: true,
} satisfies Prisma.ReservationInclude;

export type ReservationForClosing = Prisma.ReservationGetPayload<{
  include: typeof reservationForClosingInclude;
}>;

export function calculateTotals(
  reservation: Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>,
  input?: Pick<FinancialClosingInput, "discountTotal" | "extraTotal">,
) {
  const nights = calculateNights(reservation.checkInDate, reservation.checkOutDate);
  const dailyTotal = calculateDailyTotal(nights, reservation.dailyRate);
  const consumptionTotal = calculateConsumptionTotal(reservation.consumptions);
  const discountTotal = new Prisma.Decimal(input?.discountTotal ?? reservation.discountAmount ?? 0);
  const extraTotal = new Prisma.Decimal(input?.extraTotal ?? 0);
  const finalTotal = calculateFinalTotal(
    dailyTotal,
    consumptionTotal,
    discountTotal,
    extraTotal,
  );
  return { nights, dailyTotal, consumptionTotal, discountTotal, extraTotal, finalTotal };
}

export function validateDiscountJustification(
  input: FinancialClosingInput,
  dailyTotal: Prisma.Decimal,
): ClosingSaveResult | null {
  const discount = new Prisma.Decimal(input.discountTotal);
  const needsJustification = dailyTotal.gt(0) && discount.gt(dailyTotal.mul(0.2));
  if (needsJustification && !normalizeText(input.discountJustification)) {
    return {
      success: false,
      error: "Justificativa obrigatória para descontos acima de 20% das diárias",
      fieldErrors: {
        discountJustification: [
          "Justificativa obrigatória para descontos acima de 20% das diárias",
        ],
      },
    };
  }
  return null;
}

export function validateClosingReservation(
  reservation: ReservationForClosing | null,
): ClosingSaveResult | null {
  if (!reservation) return { success: false, error: "Reserva não encontrada" };
  if (reservation.closing?.closedAt) {
    return { success: false, error: "Fechamento finalizado não pode ser alterado" };
  }
  return null;
}

export function buildClosingData(
  input: FinancialClosingInput,
  totals: ReturnType<typeof calculateTotals>,
) {
  return {
    dailyTotal: totals.dailyTotal,
    consumptionTotal: totals.consumptionTotal,
    discountTotal: totals.discountTotal,
    extraTotal: totals.extraTotal,
    discountJustification: normalizeText(input.discountJustification),
    extraJustification: normalizeText(input.extraJustification),
    finalTotal: totals.finalTotal,
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
  };
}

export function toClosingListItem(
  closing: Prisma.FinancialClosingGetPayload<{
    include: { reservation: { include: { guest: true; room: true } } };
  }>,
): FinancialClosingListItem {
  return {
    id: closing.id,
    reservationId: closing.reservationId,
    guestName: closing.reservation.guest.name,
    roomName: closing.reservation.room.name,
    roomNumber: closing.reservation.room.number,
    checkInDate: closing.reservation.checkInDate,
    checkOutDate: closing.reservation.checkOutDate,
    dailyTotal: closing.dailyTotal.toNumber(),
    consumptionTotal: closing.consumptionTotal.toNumber(),
    discountTotal: closing.discountTotal.toNumber(),
    extraTotal: closing.extraTotal.toNumber(),
    finalTotal: closing.finalTotal.toNumber(),
    paymentStatus: closing.paymentStatus,
    paymentMethod: closing.paymentMethod,
    closedAt: closing.closedAt,
  };
}

export function toClosingDetail(
  closing: Prisma.FinancialClosingGetPayload<{ include: typeof closingInclude }>,
): FinancialClosingDetail {
  const totals = calculateTotals(closing.reservation, {
    discountTotal: closing.discountTotal.toNumber(),
    extraTotal: closing.extraTotal.toNumber(),
  });
  return {
    ...toClosingListItem(closing),
    closingId: closing.id,
    nights: totals.nights,
    dailyRate: closing.reservation.dailyRate.toNumber(),
    discountJustification: closing.discountJustification,
    extraJustification: closing.extraJustification,
    closedByName: closing.closedBy?.name ?? null,
    consumptions: closing.reservation.consumptions.map(toConsumptionItem),
  };
}

export function toDraftClosingDetail(
  reservation: Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>,
): FinancialClosingDetail {
  const totals = calculateTotals(reservation);
  return {
    id: reservation.id,
    closingId: null,
    reservationId: reservation.id,
    guestName: reservation.guest.name,
    roomName: reservation.room.name,
    roomNumber: reservation.room.number,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    nights: totals.nights,
    dailyRate: reservation.dailyRate.toNumber(),
    dailyTotal: totals.dailyTotal.toNumber(),
    consumptionTotal: totals.consumptionTotal.toNumber(),
    discountTotal: totals.discountTotal.toNumber(),
    extraTotal: totals.extraTotal.toNumber(),
    discountJustification: null,
    extraJustification: null,
    finalTotal: totals.finalTotal.toNumber(),
    paymentStatus: "PENDING",
    paymentMethod: null,
    closedAt: null,
    closedByName: null,
    consumptions: reservation.consumptions.map(toConsumptionItem),
  };
}

function toConsumptionItem(
  item: Prisma.ReservationConsumptionGetPayload<{ include: { product: true } }>,
) {
  return {
    id: item.id,
    productName: item.product?.name ?? "Produto removido",
    description: item.description,
    quantity: item.quantity.toNumber(),
    unitPrice: item.unitPrice.toNumber(),
    totalPrice: item.totalPrice.toNumber(),
    createdAt: item.createdAt,
  };
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
