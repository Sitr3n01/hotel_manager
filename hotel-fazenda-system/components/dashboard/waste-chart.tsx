"use client";

import { DashboardBarChart } from "@/components/dashboard/dashboard-bar-chart";
import type { WasteByCategory } from "@/lib/queries/dashboard";

type WasteChartProps = {
  data: WasteByCategory;
};

export function WasteChart({ data }: WasteChartProps) {
  return (
    <DashboardBarChart
      data={data}
      xDataKey="categoryName"
      emptyMessage="Nenhum desperdício registrado no período."
      valueLabel="Desperdicio"
      fill="var(--chart-4)"
    />
  );
}
