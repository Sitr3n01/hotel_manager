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
  toNumber,
} from "@/components/relatorios/report-formatters";
import { EmptyMessage } from "@/components/shared/list-parts";
import { formatDate } from "@/lib/date-format";
import type { WasteReportRow } from "@/lib/queries/reports";

type WasteTabProps = {
  data: WasteReportRow[];
};

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "productName", header: "Produto" },
  { key: "categoryName", header: "Categoria" },
  { key: "quantity", header: "Quantidade" },
  { key: "estimatedCost", header: "Custo Estimado" },
  { key: "reason", header: "Motivo" },
  { key: "date", header: "Data" },
  { key: "createdByName", header: "Responsavel" },
];

export function WasteTab({ data }: WasteTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum desperdicio registrado no periodo."
        hint="Os desperdicios lancados pela cozinha aparecem aqui."
      />
    );
  }

  return (
    <div className="space-y-4">
      <WasteHeader data={data} />
      <WasteTable data={data} />
    </div>
  );
}

function WasteHeader({ data }: WasteTabProps) {
  const totalCost = data.reduce((sum, row) => sum + toNumber(row.estimatedCost), 0);
  const totalItems = data.reduce((sum, row) => sum + toNumber(row.quantity), 0);

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {data.length} registro{data.length !== 1 ? "s" : ""} encontrado
          {data.length !== 1 ? "s" : ""}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Total desperdicio: </span>
          <span className="text-destructive font-medium">{formatCurrency(totalCost)}</span>
          <span className="text-muted-foreground"> - {formatDecimal(totalItems)} unidades</span>
        </p>
      </div>
      <ExportButton data={toExportRows(data)} columns={columns} filename="desperdicios" />
    </div>
  );
}

function WasteTable({ data }: WasteTabProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
            <MovementDetailHeaderCells />
          </TableRow>
        </TableHeader>
        <TableBody>{data.map((row) => <WasteRow key={row.id} row={row} />)}</TableBody>
      </Table>
    </div>
  );
}

function WasteRow({ row }: { row: WasteReportRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.productName}</TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {row.categoryName}
      </TableCell>
      <MovementDetailCells
        quantity={row.quantity}
        estimatedCost={row.estimatedCost}
        reason={row.reason}
        createdAt={row.createdAt}
        createdByName={row.createdByName}
      />
    </TableRow>
  );
}

function toExportRows(data: WasteReportRow[]) {
  return data.map((row) => ({
    productName: row.productName,
    categoryName: row.categoryName,
    quantity: formatDecimal(row.quantity),
    estimatedCost: formatCurrency(row.estimatedCost),
    reason: textOrDash(row.reason),
    date: formatDate(row.createdAt),
    createdByName: textOrDash(row.createdByName),
  }));
}
