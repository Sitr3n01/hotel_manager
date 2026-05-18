"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinanceiroFilters } from "@/components/financeiro/financeiro-filters";
import { FinanceiroSummaryCards } from "@/components/financeiro/financeiro-summary-cards";
import { FinanceiroTable } from "@/components/financeiro/financeiro-table";
import type {
  ClosingSummary,
  FinancialClosingListItem,
  PendingClosingReservation,
} from "@/lib/actions/financial-closing";
import type { PaymentStatus, Role } from "@prisma/client";

type Props = {
  userRole: Role;
  summary: ClosingSummary;
  closings: FinancialClosingListItem[];
  pendingReservations: PendingClosingReservation[];
  currentStatus: PaymentStatus | "ALL";
  currentFrom?: string;
  currentTo?: string;
};

export function FinanceiroPageClient({
  userRole,
  summary,
  closings,
  pendingReservations,
  currentStatus,
  currentFrom,
  currentTo,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateStatus(status: PaymentStatus | "ALL") {
    updateParams({ paymentStatus: status === "ALL" ? null : status });
  }

  function updateDateRange(from?: string, to?: string) {
    updateParams({ from: from ?? null, to: to ?? null });
  }

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(params.toString() ? `?${params.toString()}` : "/financeiro");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground text-sm">
          Fechamento de estadias, pagamentos e pendências por reserva.
        </p>
      </header>

      <FinanceiroSummaryCards summary={summary} />
      <FinanceiroFilters
        statusFilter={currentStatus}
        onStatusChange={updateStatus}
        dateFrom={currentFrom}
        dateTo={currentTo}
        onDateRangeChange={updateDateRange}
      />
      <PendingReservationsCard reservations={pendingReservations} />
      <FinanceiroTable closings={closings} userRole={userRole} />
    </div>
  );
}

function PendingReservationsCard({ reservations }: { reservations: PendingClosingReservation[] }) {
  if (reservations.length === 0) return null;

  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="text-primary h-4 w-4" />
          <h2 className="text-base font-medium">Reservas prontas para fechamento</h2>
        </div>
        <PendingReservationsTable reservations={reservations} />
      </CardContent>
    </Card>
  );
}

function PendingReservationsTable({ reservations }: { reservations: PendingClosingReservation[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hóspede</TableHead>
            <TableHead>Quarto</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Total previsto</TableHead>
            <TableHead className="w-1" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => (
            <PendingReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PendingReservationRow({ reservation }: { reservation: PendingClosingReservation }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{reservation.guestName}</TableCell>
      <TableCell>
        {reservation.roomNumber} · {reservation.roomName}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(reservation.checkInDate)} a {formatDate(reservation.checkOutDate)}
      </TableCell>
      <TableCell>{formatCurrency(reservation.estimatedTotal)}</TableCell>
      <TableCell>
        <Link
          href={`/financeiro/${reservation.id}`}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          Fechar
        </Link>
      </TableCell>
    </TableRow>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
