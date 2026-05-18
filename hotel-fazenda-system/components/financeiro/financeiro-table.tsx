"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PaymentStatus, Role } from "@prisma/client";
import type { FinancialClosingListItem } from "@/lib/actions/financial-closing";

type Props = {
  closings: FinancialClosingListItem[];
  userRole: Role;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<PaymentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PARTIAL: "default",
  PAID: "default",
  CANCELLED: "destructive",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(d));
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const COLUMNS = [
  { key: "guest", label: "Hóspede" },
  { key: "room", label: "Quarto" },
  { key: "checkIn", label: "Check-in" },
  { key: "checkOut", label: "Check-out" },
  { key: "dailyTotal", label: "Diárias" },
  { key: "consumptionTotal", label: "Consumo" },
  { key: "discountTotal", label: "Descontos" },
  { key: "finalTotal", label: "Total final" },
  { key: "paymentStatus", label: "Status" },
  { key: "actions", label: "" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FinanceiroTable({ closings, userRole: _userRole }: Props) {
  if (closings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum fechamento financeiro encontrado.
        </p>
        <p className="text-xs text-muted-foreground">
          Os fechamentos aparecerão aqui quando reservas forem finalizadas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead key={col.key} className="text-xs font-medium">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {closings.map((closing) => (
            <TableRow key={closing.id}>
              <TableCell className="text-sm font-medium">
                {closing.guestName}
              </TableCell>
              <TableCell className="text-sm">
                {closing.roomNumber}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {fmtDate(closing.checkInDate)}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {fmtDate(closing.checkOutDate)}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {fmtCurrency(closing.dailyTotal)}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {fmtCurrency(closing.consumptionTotal)}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {fmtCurrency(closing.discountTotal)}
              </TableCell>
              <TableCell className="text-sm font-medium tabular-nums">
                {fmtCurrency(closing.finalTotal)}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[closing.paymentStatus as PaymentStatus]}>
                  {STATUS_LABEL[closing.paymentStatus as PaymentStatus]}
                </Badge>
              </TableCell>
              <TableCell>
                <Link
                  href={`/financeiro/${closing.id}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "h-8 w-8",
                  )}
                  aria-label={`Detalhes do fechamento de ${closing.guestName}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
