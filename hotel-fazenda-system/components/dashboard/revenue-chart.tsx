"use client";

import { DashboardBarChart } from "@/components/dashboard/dashboard-bar-chart";
import type { RevenueByDay } from "@/lib/queries/dashboard";

type RevenueChartProps = {
  data: RevenueByDay;
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <DashboardBarChart
      data={data}
      xDataKey="date"
      emptyMessage="Nenhuma receita registrada no período."
      valueLabel="Receita"
      fill="var(--chart-1)"
      xTickFormatter={formatShortDate}
      labelFormatter={formatFullDate}
    />
  );
}

function formatShortDate(value: string) {
  const [_year, month, day] = value.split("-");
  return `${day}/${month}`;
}

function formatFullDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
