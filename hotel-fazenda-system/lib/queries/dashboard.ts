import "server-only";

import { prisma } from "@/lib/prisma";
import type { DateRange } from "@/lib/date-periods";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevenueByDay = { date: string; total: number }[];
export type OccupancyByStatus = { status: string; count: number }[];
export type WasteByCategory = { categoryName: string; total: number }[];
export type TopConsumed = {
  productName: string;
  quantity: number;
  totalPrice: number;
}[];

export type DashboardMetrics = {
  availableRooms: number;
  occupiedRooms: number;
  totalActiveRooms: number;
  todayReservations: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  periodRevenue: number;
  pendingPayments: number;
  periodWaste: number;
  lowStockCount: number;
};

// ---------------------------------------------------------------------------
// Metric queries
// ---------------------------------------------------------------------------

export async function getDashboardMetrics(range: DateRange): Promise<DashboardMetrics> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    availableRooms,
    occupiedRooms,
    totalActiveRooms,
    todayReservations,
    todayCheckIns,
    todayCheckOuts,
    periodRevenue,
    pendingPayments,
    periodWaste,
    lowStockProducts,
  ] = await Promise.all([
    prisma.room.count({ where: { status: "AVAILABLE", isActive: true } }),
    prisma.room.count({ where: { status: "OCCUPIED", isActive: true } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.reservation.count({
      where: {
        checkInDate: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    }),
    prisma.reservation.count({
      where: {
        status: "CHECKED_IN",
        checkInDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.reservation.count({
      where: {
        checkOutDate: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    }),
    prisma.financialClosing.aggregate({
      _sum: { finalTotal: true },
      where: {
        paymentStatus: "PAID",
        closedAt: { gte: range.start, lte: range.end },
      },
    }),
    prisma.financialClosing.aggregate({
      _sum: { finalTotal: true },
      where: {
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
      },
    }),
    prisma.stockMovement.aggregate({
      _sum: { estimatedCost: true },
      where: {
        type: "WASTE",
        createdAt: { gte: range.start, lte: range.end },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { currentStock: true, minimumStock: true },
    }),
  ]);

  const lowStockCount = lowStockProducts.filter(
    (p) => p.minimumStock.gt(0) && p.currentStock.lte(p.minimumStock),
  ).length;

  return {
    availableRooms,
    occupiedRooms,
    totalActiveRooms,
    todayReservations,
    todayCheckIns,
    todayCheckOuts,
    periodRevenue: Number(periodRevenue._sum.finalTotal ?? 0),
    pendingPayments: Number(pendingPayments._sum.finalTotal ?? 0),
    periodWaste: Number(periodWaste._sum.estimatedCost ?? 0),
    lowStockCount,
  };
}

// ---------------------------------------------------------------------------
// Chart queries
// ---------------------------------------------------------------------------

export async function getRevenueByDay(range: DateRange): Promise<RevenueByDay> {
  const rows = await prisma.$queryRaw<{ date: Date; total: Prisma.Decimal }[]>`
    SELECT
      DATE_TRUNC('day', "closedAt")::date AS date,
      SUM("finalTotal") AS total
    FROM "FinancialClosing"
    WHERE "paymentStatus" = 'PAID'
      AND "closedAt" >= ${range.start}
      AND "closedAt" <= ${range.end}
    GROUP BY DATE_TRUNC('day', "closedAt")::date
    ORDER BY date ASC
  `;

  return rows.map((r) => ({
    date: r.date.toISOString().split("T")[0]!,
    total: Number(r.total),
  }));
}

export async function getOccupancyByStatus(): Promise<OccupancyByStatus> {
  const groups = await prisma.room.groupBy({
    by: ["status"],
    _count: true,
    where: { isActive: true },
  });

  const statusLabels: Record<string, string> = {
    AVAILABLE: "Disponível",
    RESERVED: "Reservado",
    OCCUPIED: "Ocupado",
    MAINTENANCE: "Manutenção",
    CLEANING: "Limpeza",
    BLOCKED: "Bloqueado",
  };

  return groups.map((g) => ({
    status: statusLabels[g.status] ?? g.status,
    count: g._count,
  }));
}

export async function getWasteByCategory(range: DateRange): Promise<WasteByCategory> {
  const rows = await prisma.$queryRaw<
    { categoryName: string; total: Prisma.Decimal }[]
  >`
    SELECT
      pc."name" AS "categoryName",
      SUM(sm."estimatedCost") AS total
    FROM "StockMovement" sm
    INNER JOIN "Product" p ON p."id" = sm."productId"
    INNER JOIN "ProductCategory" pc ON pc."id" = p."categoryId"
    WHERE sm."type" = 'WASTE'
      AND sm."createdAt" >= ${range.start}
      AND sm."createdAt" <= ${range.end}
    GROUP BY pc."name"
    ORDER BY total DESC
  `;

  return rows.map((r) => ({
    categoryName: r.categoryName,
    total: Number(r.total),
  }));
}

export async function getTopConsumed(range: DateRange): Promise<TopConsumed> {
  const groups = await prisma.reservationConsumption.groupBy({
    by: ["productId"],
    _sum: { quantity: true, totalPrice: true },
    where: {
      createdAt: { gte: range.start, lte: range.end },
      productId: { not: null },
    },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  const productIds = groups.map((g) => g.productId).filter(Boolean) as string[];

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return groups
    .filter((g) => g.productId)
    .map((g) => ({
      productName: productMap.get(g.productId!) ?? "Produto removido",
      quantity: Number(g._sum.quantity ?? 0),
      totalPrice: Number(g._sum.totalPrice ?? 0),
    }));
}
