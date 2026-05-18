import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton, type ExportColumn } from "@/components/relatorios/export-button";
import { formatCurrency } from "@/components/relatorios/report-formatters";
import { EmptyMessage } from "@/components/shared/list-parts";
import { formatDateRange } from "@/lib/date-format";
import type { FinancialReportRow } from "@/lib/queries/reports";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PARTIAL: "Parcial",
  PAID: "Pago",
  CANCELLED: "Cancelado",
};

const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  PENDING: "bg-warning/15 text-warning border-warning/30",
  PAID: "bg-success/10 text-success border-success/30",
  PARTIAL: "bg-primary/10 text-primary border-primary/30",
  CANCELLED: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
};

type FinancialTabProps = {
  data: FinancialReportRow[];
};

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "guestName", header: "Hóspede" },
  { key: "room", header: "Quarto" },
  { key: "period", header: "Período" },
  { key: "dailyTotal", header: "Total Diárias" },
  { key: "consumptionTotal", header: "Total Consumo" },
  { key: "discountTotal", header: "Descontos" },
  { key: "extraTotal", header: "Acréscimos" },
  { key: "finalTotal", header: "Total Final" },
  { key: "paymentStatus", header: "Status Pagamento" },
  { key: "paymentMethod", header: "Método" },
];

export function FinancialTab({ data }: FinancialTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum fechamento encontrado no período."
        hint="Os fechamentos aparecem aqui após o check-out e fechamento financeiro."
      />
    );
  }

  return (
    <div className="space-y-4">
      <FinancialReportHeader data={data} />
      <FinancialReportTable data={data} />
    </div>
  );
}

function FinancialReportHeader({ data }: FinancialTabProps) {
  const totalRevenue = data.reduce((sum, row) => sum + row.finalTotal, 0);
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {data.length} fechamento{data.length !== 1 ? "s" : ""} encontrado{data.length !== 1 ? "s" : ""}
        </p>
        <p className="text-sm font-medium">
          Total receita: <span className="text-success">{formatCurrency(totalRevenue)}</span>
        </p>
      </div>
      <ExportButton data={toExportRows(data)} columns={columns} filename="fechamentos" />
    </div>
  );
}

function FinancialReportTable({ data }: FinancialTabProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hóspede</TableHead>
            <TableHead className="hidden sm:table-cell">Quarto</TableHead>
            <TableHead className="hidden md:table-cell">Período</TableHead>
            <TableHead className="hidden lg:table-cell">Diárias</TableHead>
            <TableHead className="hidden lg:table-cell">Consumo</TableHead>
            <TableHead>Total Final</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Método</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{data.map((row) => <FinancialReportRowView key={row.id} row={row} />)}</TableBody>
      </Table>
    </div>
  );
}

function FinancialReportRowView({ row }: { row: FinancialReportRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.guestName}</TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {row.roomName} ({row.roomNumber})
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
        {formatDateRange(row.checkInDate, row.checkOutDate)}
      </TableCell>
      <TableCell className="hidden lg:table-cell">{formatCurrency(row.dailyTotal)}</TableCell>
      <TableCell className="hidden lg:table-cell">{formatCurrency(row.consumptionTotal)}</TableCell>
      <TableCell className="font-medium">{formatCurrency(row.finalTotal)}</TableCell>
      <TableCell><PaymentStatusBadge status={row.paymentStatus} /></TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatPaymentMethod(row.paymentMethod)}
      </TableCell>
    </TableRow>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={`border ${PAYMENT_STATUS_CLASSES[status]}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function toExportRows(data: FinancialReportRow[]) {
  return data.map((row) => ({
    guestName: row.guestName,
    room: `${row.roomName} (${row.roomNumber})`,
    period: formatDateRange(row.checkInDate, row.checkOutDate),
    dailyTotal: formatCurrency(row.dailyTotal),
    consumptionTotal: formatCurrency(row.consumptionTotal),
    discountTotal: formatCurrency(row.discountTotal),
    extraTotal: formatCurrency(row.extraTotal),
    finalTotal: formatCurrency(row.finalTotal),
    paymentStatus: PAYMENT_STATUS_LABELS[row.paymentStatus],
    paymentMethod: formatPaymentMethod(row.paymentMethod),
  }));
}

function formatPaymentMethod(method: string | null): string {
  return method ? PAYMENT_METHOD_LABELS[method as PaymentMethod] : "-";
}
