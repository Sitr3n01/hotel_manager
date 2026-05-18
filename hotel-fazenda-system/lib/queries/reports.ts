import "server-only";

import { prisma } from "@/lib/prisma";
import type { DateRange } from "@/lib/date-periods";
import type {
  ReservationStatus,
  PaymentStatus,
  MovementType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Reservations report
// ---------------------------------------------------------------------------

export type ReservationReportRow = {
  id: string;
  guestName: string;
  guestDocument: string | null;
  roomName: string;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  dailyRate: number;
  discountAmount: number;
  status: ReservationStatus;
};

export async function getReservationsReport(
  range: DateRange,
  status?: ReservationStatus,
): Promise<ReservationReportRow[]> {
  const reservations = await prisma.reservation.findMany({
    include: {
      guest: { select: { name: true, document: true } },
      room: { select: { name: true, number: true } },
    },
    where: {
      checkInDate: { gte: range.start, lte: range.end },
      ...(status ? { status } : {}),
    },
    orderBy: { checkInDate: "desc" },
  });
  return reservations.map((r) => ({
    id: r.id,
    guestName: r.guest.name,
    guestDocument: r.guest.document,
    roomName: r.room.name,
    roomNumber: r.room.number,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    dailyRate: r.dailyRate.toNumber(),
    discountAmount: r.discountAmount.toNumber(),
    status: r.status,
  }));
}

// ---------------------------------------------------------------------------
// Financial closings report
// ---------------------------------------------------------------------------

export type FinancialReportRow = {
  id: string;
  guestName: string;
  roomName: string;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  dailyTotal: number;
  consumptionTotal: number;
  discountTotal: number;
  extraTotal: number;
  finalTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  closedAt: Date | null;
};

export async function getFinancialReport(
  range: DateRange,
  paymentStatus?: PaymentStatus,
): Promise<FinancialReportRow[]> {
  const closings = await prisma.financialClosing.findMany({
    include: {
      reservation: {
        include: {
          guest: { select: { name: true } },
          room: { select: { name: true, number: true } },
        },
      },
    },
    where: {
      closedAt: { gte: range.start, lte: range.end },
      ...(paymentStatus ? { paymentStatus } : {}),
    },
    orderBy: { closedAt: "desc" },
  });

  return closings.map((c) => ({
    id: c.id,
    guestName: c.reservation.guest.name,
    roomName: c.reservation.room.name,
    roomNumber: c.reservation.room.number,
    checkInDate: c.reservation.checkInDate,
    checkOutDate: c.reservation.checkOutDate,
    dailyTotal: c.dailyTotal.toNumber(),
    consumptionTotal: c.consumptionTotal.toNumber(),
    discountTotal: c.discountTotal.toNumber(),
    extraTotal: c.extraTotal.toNumber(),
    finalTotal: c.finalTotal.toNumber(),
    paymentStatus: c.paymentStatus,
    paymentMethod: c.paymentMethod,
    closedAt: c.closedAt,
  }));
}

// ---------------------------------------------------------------------------
// Consumption by reservation report
// ---------------------------------------------------------------------------

export type ConsumptionReportRow = {
  id: string;
  reservationId: string;
  guestName: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
};

export async function getConsumptionReport(
  range: DateRange,
  guestSearch?: string,
): Promise<ConsumptionReportRow[]> {
  const consumptions = await prisma.reservationConsumption.findMany({
    include: {
      reservation: {
        include: {
          guest: { select: { name: true } },
        },
      },
      product: { select: { name: true } },
    },
    where: {
      createdAt: { gte: range.start, lte: range.end },
      ...(guestSearch
        ? {
            reservation: {
              guest: {
                name: { contains: guestSearch, mode: "insensitive" },
              },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return consumptions.map((c) => ({
    id: c.id,
    reservationId: c.reservationId,
    guestName: c.reservation.guest.name,
    productName: c.product?.name ?? "Produto removido",
    description: c.description,
    quantity: c.quantity.toNumber(),
    unitPrice: c.unitPrice.toNumber(),
    totalPrice: c.totalPrice.toNumber(),
    createdAt: c.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Waste report
// ---------------------------------------------------------------------------

export type WasteReportRow = {
  id: string;
  productName: string;
  categoryName: string;
  quantity: number;
  estimatedCost: number;
  reason: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export async function getWasteReport(range: DateRange): Promise<WasteReportRow[]> {
  const movements = await prisma.stockMovement.findMany({
    include: {
      product: { include: { category: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
    where: {
      type: "WASTE",
      createdAt: { gte: range.start, lte: range.end },
    },
    orderBy: { createdAt: "desc" },
  });
  return movements.map((m) => ({
    id: m.id,
    productName: m.product.name,
    categoryName: m.product.category.name,
    quantity: m.quantity.toNumber(),
    estimatedCost: m.estimatedCost.toNumber(),
    reason: m.reason,
    createdAt: m.createdAt,
    createdByName: m.createdBy?.name ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Stock movements report
// ---------------------------------------------------------------------------

export type StockMovementReportRow = {
  id: string;
  productName: string;
  type: MovementType;
  quantity: number;
  estimatedCost: number;
  reason: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export async function getStockMovementsReport(
  range: DateRange,
  type?: MovementType,
): Promise<StockMovementReportRow[]> {
  const movements = await prisma.stockMovement.findMany({
    include: {
      product: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    where: {
      createdAt: { gte: range.start, lte: range.end },
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return movements.map((m) => ({
    id: m.id,
    productName: m.product.name,
    type: m.type,
    quantity: m.quantity.toNumber(),
    estimatedCost: m.estimatedCost.toNumber(),
    reason: m.reason,
    createdAt: m.createdAt,
    createdByName: m.createdBy?.name ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Top consumed products report
// ---------------------------------------------------------------------------

export type TopProductRow = {
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalCost: number;
};

export async function getTopProductsReport(range: DateRange): Promise<TopProductRow[]> {
  const groups = await prisma.reservationConsumption.groupBy({
    by: ["productId"],
    _sum: { quantity: true, totalPrice: true },
    where: {
      createdAt: { gte: range.start, lte: range.end },
      productId: { not: null },
    },
    orderBy: { _sum: { quantity: "desc" } },
    take: 50,
  });

  const productIds = groups.map((g) => g.productId).filter(Boolean) as string[];

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: { category: { select: { name: true } } },
        })
      : [];

  const productMap = new Map(products.map((p) => [p.id, p]));

  return groups
    .filter((g) => g.productId)
    .map((g) => {
      const product = productMap.get(g.productId!);
      return {
        productName: product?.name ?? "Produto removido",
        categoryName: product?.category?.name ?? "—",
        totalQuantity: Number(g._sum.quantity ?? 0),
        totalCost: Number(g._sum.totalPrice ?? 0),
      };
    });
}

// ---------------------------------------------------------------------------
// Low stock report
// ---------------------------------------------------------------------------

export type LowStockRow = {
  id: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
};

export async function getLowStockReport(): Promise<LowStockRow[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return products
    .filter((p) => p.minimumStock.gt(0) && p.currentStock.lte(p.minimumStock))
    .map((p) => ({
      id: p.id,
      productName: p.name,
      categoryName: p.category.name,
      currentStock: p.currentStock.toNumber(),
      minimumStock: p.minimumStock.toNumber(),
      unit: p.unit,
    }));
}
