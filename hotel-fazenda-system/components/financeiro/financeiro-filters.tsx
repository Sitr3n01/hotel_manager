"use client";

import type { PaymentStatus } from "@prisma/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  statusFilter: PaymentStatus | "ALL";
  onStatusChange: (status: PaymentStatus | "ALL") => void;
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange: (from?: string, to?: string) => void;
};

const STATUS_OPTIONS: { value: PaymentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos os status" },
  { value: "PENDING", label: "Pendente" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Pago" },
  { value: "CANCELLED", label: "Cancelado" },
];

export function FinanceiroFilters({
  statusFilter,
  onStatusChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-48 space-y-1.5">
        <Label htmlFor="filter-status" className="text-xs">
          Status de pagamento
        </Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusChange(v as PaymentStatus | "ALL")}
        >
          <SelectTrigger id="filter-status" className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-from" className="text-xs">
          De
        </Label>
        <input
          id="filter-from"
          type="date"
          value={dateFrom ?? ""}
          onChange={(e) =>
            onDateRangeChange(e.target.value || undefined, dateTo)
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-to" className="text-xs">
          Até
        </Label>
        <input
          id="filter-to"
          type="date"
          value={dateTo ?? ""}
          onChange={(e) =>
            onDateRangeChange(dateFrom, e.target.value || undefined)
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
