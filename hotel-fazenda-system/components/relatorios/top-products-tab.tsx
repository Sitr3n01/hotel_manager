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
import { EmptyMessage } from "@/components/shared/list-parts";
import type { TopProductRow } from "@/lib/queries/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDecimal(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TopProductsTabProps = {
  data: TopProductRow[];
};

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "productName", header: "Produto" },
  { key: "categoryName", header: "Categoria" },
  { key: "totalQuantity", header: "Qtd Total Consumida" },
  { key: "totalCost", header: "Custo Total" },
];

export function TopProductsTab({ data }: TopProductsTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum consumo de produto registrado no período."
        hint="Os produtos mais consumidos aparecem aqui após registros de consumo."
      />
    );
  }

  const exportData = data.map((r) => ({
    productName: r.productName,
    categoryName: r.categoryName,
    totalQuantity: fmtDecimal(r.totalQuantity),
    totalCost: fmtCurrency(r.totalCost),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data.length} produto{data.length !== 1 ? "s" : ""} listado
          {data.length !== 1 ? "s" : ""}
        </p>
        <ExportButton data={exportData} columns={columns} filename="produtos-mais-consumidos" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead>Qtd Total</TableHead>
              <TableHead className="text-right">Custo Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.productName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {r.categoryName}
                </TableCell>
                <TableCell>{fmtDecimal(r.totalQuantity)}</TableCell>
                <TableCell className="text-right font-medium">
                  {fmtCurrency(r.totalCost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
