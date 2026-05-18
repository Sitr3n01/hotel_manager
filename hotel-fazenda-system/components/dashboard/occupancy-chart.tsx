"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { OccupancyByStatus } from "@/lib/queries/dashboard";

const STATUS_COLORS: Record<string, string> = {
  Disponível: "var(--chart-2)",
  Reservado: "var(--chart-1)",
  Ocupado: "var(--chart-4)",
  Manutenção: "var(--chart-3)",
  Limpeza: "var(--chart-5)",
  Bloqueado: "var(--muted-foreground)",
};

type OccupancyChartProps = {
  data: OccupancyByStatus;
};

export function OccupancyChart({ data }: OccupancyChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum quarto ativo encontrado.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(props) => {
            const { status, count } = props as unknown as { status: string; count: number };
            return `${status} (${count})`;
          }}
          labelLine={{ strokeWidth: 1 }}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] ?? "var(--muted-foreground)"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          formatter={(value: string) => <span className="text-foreground text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
