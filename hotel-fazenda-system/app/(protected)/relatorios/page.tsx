import { redirect } from "next/navigation";
import type { MovementType, PaymentStatus, ReservationStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  canViewReports,
  canViewReportsFinancial,
  canViewReportsKitchen,
  type AccessSubject,
} from "@/lib/permissions";
import { getDateRange, type DateRange, type PeriodPreset } from "@/lib/date-periods";
import {
  getConsumptionReport,
  getFinancialReport,
  getLowStockReport,
  getReservationsReport,
  getStockMovementsReport,
  getTopProductsReport,
  getWasteReport,
} from "@/lib/queries/reports";
import { RelatoriosPageClient } from "@/components/relatorios/relatorios-page-client";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAuth();
  if (!canViewReports(user)) redirect("/dashboard");

  const filters = parseFilters(await searchParams);
  const range = getDateRange(filters.preset, toDate(filters.fromStr), toDate(filters.toStr));
  const reports = await loadReports(user, range, filters);

  return <RelatoriosPageClient userRole={user.role} {...filters} {...reports} />;
}

function parseFilters(params: SearchParams) {
  return {
    activeTab: readParam(params.tab) ?? "reservas",
    currentPreset: readPeriod(params.periodo),
    preset: readPeriod(params.periodo),
    currentFrom: readParam(params.from),
    currentTo: readParam(params.to),
    fromStr: readParam(params.from),
    toStr: readParam(params.to),
    currentStatus: readParam(params.status),
    currentPaymentStatus: readParam(params.paymentStatus),
    currentType: readParam(params.tipo),
    currentSearch: readParam(params.busca),
  };
}

async function loadReports(
  subject: AccessSubject,
  range: DateRange,
  filters: ReturnType<typeof parseFilters>,
) {
  const [reservations, financials, consumptions, kitchen] = await Promise.all([
    getReservationsReport(range, filters.currentStatus as ReservationStatus | undefined),
    loadFinancialReport(subject, range, filters.currentPaymentStatus),
    getConsumptionReport(range, filters.currentSearch),
    loadKitchenReports(subject, range, filters.currentType),
  ]);

  return {
    reservations,
    financials,
    consumptions,
    wastes: kitchen.wastes,
    stockMovements: kitchen.stockMovements,
    topProducts: kitchen.topProducts,
    lowStock: kitchen.lowStock,
  };
}

async function loadFinancialReport(
  subject: AccessSubject,
  range: DateRange,
  paymentStatus?: string,
) {
  if (!canViewReportsFinancial(subject)) return [];
  return getFinancialReport(range, paymentStatus as PaymentStatus | undefined);
}

async function loadKitchenReports(subject: AccessSubject, range: DateRange, type?: string) {
  if (!canViewReportsKitchen(subject)) {
    return { wastes: [], stockMovements: [], topProducts: [], lowStock: [] };
  }

  const [wastes, stockMovements, topProducts, lowStock] = await Promise.all([
    getWasteReport(range),
    getStockMovementsReport(range, type as MovementType | undefined),
    getTopProductsReport(range),
    getLowStockReport(),
  ]);
  return { wastes, stockMovements, topProducts, lowStock };
}

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readPeriod(value: string | string[] | undefined): PeriodPreset {
  const preset = readParam(value);
  if (preset && ["today", "last7", "currentMonth", "lastMonth", "custom"].includes(preset)) {
    return preset as PeriodPreset;
  }
  return "currentMonth";
}

function toDate(value?: string): Date | undefined {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}
