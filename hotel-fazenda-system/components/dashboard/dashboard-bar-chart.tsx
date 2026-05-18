"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DataKey } from "recharts/types/util/types";

type DashboardBarChartProps<T extends object> = {
  data: T[];
  xDataKey: DataKey<T>;
  emptyMessage: string;
  valueLabel: string;
  fill: string;
  xTickFormatter?: (value: string) => string;
  labelFormatter?: (label: string) => string;
};

export function DashboardBarChart<T extends object>({
  data,
  xDataKey,
  emptyMessage,
  valueLabel,
  fill,
  xTickFormatter,
  labelFormatter,
}: DashboardBarChartProps<T>) {
  if (data.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey={xDataKey}
          tick={{ fontSize: 12 }}
          tickFormatter={xTickFormatter}
          className="text-muted-foreground text-xs"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={formatAxisCurrency}
          width={80}
          className="text-muted-foreground text-xs"
        />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
          formatter={(value) => [formatTooltipCurrency(Number(value)), valueLabel]}
          labelFormatter={(label) => labelFormatter?.(String(label)) ?? String(label)}
        />
        <Bar dataKey="total" fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function formatAxisCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatTooltipCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
