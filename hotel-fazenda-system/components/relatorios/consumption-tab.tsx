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
import { formatCurrency, formatDecimal } from "@/components/relatorios/report-formatters";
import { EmptyMessage } from "@/components/shared/list-parts";
import { formatDate } from "@/lib/date-format";
import type { ConsumptionReportRow } from "@/lib/queries/reports";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ConsumptionTabProps = {
  data: ConsumptionReportRow[];
};

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "guestName", header: "Hóspede" },
  { key: "productName", header: "Produto" },
  { key: "description", header: "Descrição" },
  { key: "quantity", header: "Quantidade" },
  { key: "unitPrice", header: "Preço Unit." },
  { key: "totalPrice", header: "Total" },
  { key: "date", header: "Data" },
];

export function ConsumptionTab({ data }: ConsumptionTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum consumo vinculado a reserva no período."
        hint="Os consumos da cozinha vinculados a reservas aparecem aqui."
      />
    );
  }

  const exportData = data.map((r) => ({
    guestName: r.guestName,
    productName: r.productName,
    description: r.description,
    quantity: formatDecimal(r.quantity),
    unitPrice: formatCurrency(r.unitPrice),
    totalPrice: formatCurrency(r.totalPrice),
    date: formatDate(r.createdAt),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data.length} registro{data.length !== 1 ? "s" : ""} encontrado
          {data.length !== 1 ? "s" : ""}
        </p>
        <ExportButton data={exportData} columns={columns} filename="consumo-por-reserva" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hóspede</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Qtd</TableHead>
              <TableHead className="hidden lg:table-cell">Preço Unit.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.guestName}</TableCell>
                <TableCell>{r.productName}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                  {r.description}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDecimal(r.quantity)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {formatCurrency(r.unitPrice)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(r.totalPrice)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {formatDate(r.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
