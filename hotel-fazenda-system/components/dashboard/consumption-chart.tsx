"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TopConsumed } from "@/lib/queries/dashboard";

type ConsumptionChartProps = {
  data: TopConsumed;
};

export function ConsumptionChart({ data }: ConsumptionChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum consumo registrado no período.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground text-xs" />
        <YAxis
          type="category"
          dataKey="productName"
          tick={{ fontSize: 12 }}
          width={120}
          className="text-muted-foreground text-xs"
        />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
          formatter={
            ((value, name) => [
              name === "quantity"
                ? String(value ?? "")
                : Number(value ?? 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }),
              name === "quantity" ? "Quantidade" : "Custo total",
            ]) as React.ComponentProps<typeof Tooltip>["formatter"]
          }
        />
        <Bar dataKey="quantity" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
