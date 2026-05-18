import { requireAuth } from "@/lib/auth/require-auth";
import {
  canViewDashboard,
  canViewDashboardFinancial,
  canViewDashboardKitchen,
} from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getDateRange } from "@/lib/date-periods";
import type { DateRange, PeriodPreset } from "@/lib/date-periods";
import {
  getDashboardMetrics,
  getRevenueByDay,
  getOccupancyByStatus,
  getWasteByCategory,
  getTopConsumed,
  type DashboardMetrics,
} from "@/lib/queries/dashboard";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

type DashboardSearchParams = { [key: string]: string | string[] | undefined };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const user = await requireAuth();

  if (!canViewDashboard(user)) {
    redirect("/login");
  }

  const period = resolveDashboardPeriod(await searchParams);
  const dashboardData = await loadDashboardData(period.range);
  const canSeeFinancial = canViewDashboardFinancial(user);
  const canSeeKitchen = canViewDashboardKitchen(user);
  const visibleData = filterDashboardData(dashboardData, canSeeFinancial, canSeeKitchen);

  return (
    <DashboardPageClient
      userRole={user.role}
      permissions={user.permissions}
      userName={user.name}
      metrics={visibleData.metrics}
      revenueByDay={visibleData.revenueByDay}
      occupancyByStatus={visibleData.occupancyByStatus}
      wasteByCategory={visibleData.wasteByCategory}
      topConsumed={visibleData.topConsumed}
      currentPreset={period.preset}
      currentFrom={period.fromStr}
      currentTo={period.toStr}
    />
  );
}

function resolveDashboardPeriod(params: DashboardSearchParams) {
  const preset = (readStringParam(params.periodo) as PeriodPreset | undefined) ?? "currentMonth";
  const fromStr = readStringParam(params.from);
  const toStr = readStringParam(params.to);
  const range = getDateRange(preset, toDateParam(fromStr), toDateParam(toStr));

  return { preset, fromStr, toStr, range };
}

async function loadDashboardData(range: DateRange) {
  const [metrics, revenueByDay, occupancyByStatus, wasteByCategory, topConsumed] =
    await Promise.all([
      getDashboardMetrics(range),
      getRevenueByDay(range),
      getOccupancyByStatus(),
      getWasteByCategory(range),
      getTopConsumed(range),
    ]);

  return { metrics, revenueByDay, occupancyByStatus, wasteByCategory, topConsumed };
}

function filterDashboardData(
  data: Awaited<ReturnType<typeof loadDashboardData>>,
  canSeeFinancial: boolean,
  canSeeKitchen: boolean,
) {
  return {
    metrics: filterDashboardMetrics(data.metrics, canSeeFinancial, canSeeKitchen),
    revenueByDay: canSeeFinancial ? data.revenueByDay : [],
    occupancyByStatus: data.occupancyByStatus,
    wasteByCategory: canSeeKitchen ? data.wasteByCategory : [],
    topConsumed: canSeeKitchen ? data.topConsumed : [],
  };
}

function filterDashboardMetrics(
  metrics: DashboardMetrics,
  canSeeFinancial: boolean,
  canSeeKitchen: boolean,
): DashboardMetrics {
  return {
    ...metrics,
    periodRevenue: canSeeFinancial ? metrics.periodRevenue : 0,
    pendingPayments: canSeeFinancial ? metrics.pendingPayments : 0,
    periodWaste: canSeeKitchen ? metrics.periodWaste : 0,
    lowStockCount: canSeeKitchen ? metrics.lowStockCount : 0,
  };
}

function readStringParam(value: DashboardSearchParams[string]): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toDateParam(value: string | undefined): Date | undefined {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}
