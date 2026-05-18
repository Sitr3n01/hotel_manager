import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReservationStatusBadge } from "@/components/reservas/reservation-status-badge";
import { ExportButton } from "@/components/relatorios/export-button";
import type { ExportColumn } from "@/components/relatorios/export-button";
import { EmptyMessage } from "@/components/shared/list-parts";
import { formatDate } from "@/lib/date-format";
import { calculateNights } from "@/lib/financial-calculations";
import type { ReservationReportRow } from "@/lib/queries/reports";

type ReservationsTabProps = {
  data: ReservationReportRow[];
};

function fmtCurrency(value: { toNumber: () => number } | number): string {
  const n = typeof value === "number" ? value : value.toNumber();
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcTotal(row: ReservationReportRow): number {
  const nights = calculateNights(row.checkInDate, row.checkOutDate);
  const dailyTotal = nights * row.dailyRate;
  const total = dailyTotal - row.discountAmount;
  return Math.max(total, 0);
}

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "guestName", header: "Hóspede" },
  { key: "document", header: "Documento" },
  { key: "room", header: "Quarto" },
  { key: "checkIn", header: "Check-in" },
  { key: "checkOut", header: "Check-out" },
  { key: "dailyRate", header: "Diária" },
  { key: "status", header: "Status" },
  { key: "total", header: "Total" },
];

export function ReservationsTab({ data }: ReservationsTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhuma reserva encontrada no período."
        hint="Ajuste os filtros ou aguarde novas reservas."
      />
    );
  }

  const exportData = data.map((r) => ({
    guestName: r.guestName,
    document: r.guestDocument ?? "—",
    room: `${r.roomName} (${r.roomNumber})`,
    checkIn: formatDate(r.checkInDate),
    checkOut: formatDate(r.checkOutDate),
    dailyRate: fmtCurrency(r.dailyRate),
    status: r.status,
    total: fmtCurrency(calcTotal(r)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data.length} registro{data.length !== 1 ? "s" : ""} encontrado
          {data.length !== 1 ? "s" : ""}
        </p>
        <ExportButton data={exportData} columns={columns} filename="reservas" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hóspede</TableHead>
              <TableHead className="hidden sm:table-cell">Documento</TableHead>
              <TableHead>Quarto</TableHead>
              <TableHead className="hidden md:table-cell">Check-in</TableHead>
              <TableHead className="hidden md:table-cell">Check-out</TableHead>
              <TableHead className="hidden lg:table-cell">Diária</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.guestName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {r.guestDocument ?? "—"}
                </TableCell>
                <TableCell>
                  {r.roomName} <span className="text-muted-foreground">({r.roomNumber})</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(r.checkInDate)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(r.checkOutDate)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {fmtCurrency(r.dailyRate)}
                </TableCell>
                <TableCell>
                  <ReservationStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {fmtCurrency(calcTotal(r))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
