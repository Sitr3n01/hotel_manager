"use client";

import { Calculator, CheckCircle, Clock, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type ClosingSummary = {
  pendingTotal: number;
  partialTotal: number;
  paidTotal: number;
  grandTotal: number;
};

type Props = {
  summary: ClosingSummary;
};

function fmt(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const cards = [
  {
    key: "pending",
    label: "Pendente",
    icon: Clock,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
  },
  {
    key: "partial",
    label: "Parcial",
    icon: CreditCard,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
  },
  {
    key: "paid",
    label: "Pago",
    icon: CheckCircle,
    colorClass: "text-green-600",
    bgClass: "bg-green-50",
  },
  {
    key: "grand",
    label: "Total Previsto",
    icon: Calculator,
    colorClass: "text-slate-600",
    bgClass: "bg-slate-50",
  },
] as const;

export function FinanceiroSummaryCards({ summary }: Props) {
  const values: Record<string, number> = {
    pending: summary.pendingTotal,
    partial: summary.partialTotal,
    paid: summary.paidTotal,
    grand: summary.grandTotal,
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, colorClass, bgClass }) => (
        <Card key={key} className="elevation-1 border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${bgClass}`}
            >
              <Icon className={`h-5 w-5 ${colorClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="truncate text-lg font-medium tabular-nums">
                {fmt(values[key])}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
