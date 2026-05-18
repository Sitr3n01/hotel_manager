import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "@/components/relatorios/export-button";
import type { ExportColumn } from "@/components/relatorios/export-button";
import {
  MovementDetailCells,
  MovementDetailHeaderCells,
} from "@/components/relatorios/movement-detail-cells";
import {
  formatCurrency,
  formatDecimal,
  textOrDash,
} from "@/components/relatorios/report-formatters";
import { EmptyMessage } from "@/components/shared/list-parts";
import { formatDate } from "@/lib/date-format";
import type { StockMovementReportRow } from "@/lib/queries/reports";
import type { MovementType } from "@prisma/client";

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  IN: "Entrada",
  RESERVATION_CONSUMPTION: "Consumo de Reserva",
  INTERNAL_CONSUMPTION: "Consumo Interno",
  WASTE: "Desperdicio",
  POSITIVE_ADJUSTMENT: "Ajuste Positivo",
  NEGATIVE_ADJUSTMENT: "Ajuste Negativo",
};

const MOVEMENT_TYPE_CLASSES: Record<MovementType, string> = {
  IN: "bg-success/10 text-success border-success/30",
  RESERVATION_CONSUMPTION: "bg-primary/10 text-primary border-primary/30",
  INTERNAL_CONSUMPTION: "bg-accent text-accent-foreground border-accent/30",
  WASTE: "bg-destructive/10 text-destructive border-destructive/30",
  POSITIVE_ADJUSTMENT: "bg-warning/15 text-warning border-warning/30",
  NEGATIVE_ADJUSTMENT: "bg-warning/15 text-warning border-warning/30",
};

type StockMovementsTabProps = {
  data: StockMovementReportRow[];
};

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "productName", header: "Produto" },
  { key: "type", header: "Tipo" },
  { key: "quantity", header: "Quantidade" },
  { key: "estimatedCost", header: "Custo Estimado" },
  { key: "reason", header: "Motivo" },
  { key: "date", header: "Data" },
  { key: "createdByName", header: "Responsavel" },
];

export function StockMovementsTab({ data }: StockMovementsTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhuma movimentacao de estoque no periodo."
        hint="As movimentacoes de estoque aparecem aqui apos registros na cozinha."
      />
    );
  }

  return (
    <div className="space-y-4">
      <StockMovementsHeader data={data} />
      <StockMovementsTable data={data} />
    </div>
  );
}

function StockMovementsHeader({ data }: StockMovementsTabProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        {data.length} movimentacao{data.length !== 1 ? "es" : ""} encontrada
        {data.length !== 1 ? "s" : ""}
      </p>
      <ExportButton
        data={toExportRows(data)}
        columns={columns}
        filename="movimentacoes-estoque"
      />
    </div>
  );
}

function StockMovementsTable({ data }: StockMovementsTabProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <MovementDetailHeaderCells quantityClassName="hidden sm:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>{data.map((row) => <StockMovementRow key={row.id} row={row} />)}</TableBody>
      </Table>
    </div>
  );
}

function StockMovementRow({ row }: { row: StockMovementReportRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.productName}</TableCell>
      <TableCell>
        <MovementTypeBadge type={row.type} />
      </TableCell>
      <MovementDetailCells
        quantity={row.quantity}
        estimatedCost={row.estimatedCost}
        reason={row.reason}
        createdAt={row.createdAt}
        createdByName={row.createdByName}
        quantityClassName="hidden sm:table-cell"
      />
    </TableRow>
  );
}

function MovementTypeBadge({ type }: { type: MovementType }) {
  return (
    <Badge variant="outline" className={`border ${MOVEMENT_TYPE_CLASSES[type]}`}>
      {MOVEMENT_TYPE_LABELS[type]}
    </Badge>
  );
}

function toExportRows(data: StockMovementReportRow[]) {
  return data.map((row) => ({
    productName: row.productName,
    type: MOVEMENT_TYPE_LABELS[row.type],
    quantity: formatDecimal(row.quantity),
    estimatedCost: formatCurrency(row.estimatedCost),
    reason: textOrDash(row.reason),
    date: formatDate(row.createdAt),
    createdByName: textOrDash(row.createdByName),
  }));
}
