"use client";

import { AlertTriangle } from "lucide-react";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

export function LowStockBanner({ products }: { products: ProductWithCategory[] }) {
  const low = products.filter(
    (p) =>
      p.isActive && Number(p.minimumStock) > 0 && Number(p.currentStock) <= Number(p.minimumStock),
  );
  if (low.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">
          {low.length} produto{low.length === 1 ? "" : "s"} no estoque mínimo ou abaixo.
        </p>
        <p className="text-xs opacity-80">
          {low
            .slice(0, 5)
            .map((p) => `${p.name} (${p.currentStock} ${p.unit.toLowerCase()})`)
            .join(", ")}
          {low.length > 5 ? `, +${low.length - 5}` : ""}
        </p>
      </div>
    </div>
  );
}
