import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/relatorios/export-button";
import type { ExportColumn } from "@/components/relatorios/export-button";
import { EmptyMessage } from "@/components/shared/list-parts";
import type { LowStockRow } from "@/lib/queries/reports";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UNIT_LABELS: Record<string, string> = {
  UNIT: "un",
  KG: "kg",
  G: "g",
  L: "L",
  ML: "ml",
  PACKAGE: "pc",
  BOX: "cx",
};

function fmtDecimal(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type LowStockTabProps = {
  data: LowStockRow[];
};

const columns: ExportColumn<Record<string, unknown>>[] = [
  { key: "productName", header: "Produto" },
  { key: "categoryName", header: "Categoria" },
  { key: "current", header: "Estoque Atual" },
  { key: "minimum", header: "Estoque Mínimo" },
  { key: "unit", header: "Unidade" },
];

export function LowStockTab({ data }: LowStockTabProps) {
  if (data.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum produto com estoque baixo."
        hint="Todos os produtos estão com estoque acima do mínimo configurado."
      />
    );
  }

  const exportData = data.map((r) => ({
    productName: r.productName,
    categoryName: r.categoryName,
    current: fmtDecimal(r.currentStock),
    minimum: fmtDecimal(r.minimumStock),
    unit: UNIT_LABELS[r.unit] ?? r.unit,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">
            {data.length} produto{data.length !== 1 ? "s" : ""} abaixo do estoque mínimo
          </p>
          <Badge variant="destructive" className="text-xs">
            Atenção
          </Badge>
        </div>
        <ExportButton data={exportData} columns={columns} filename="estoque-baixo" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead>Estoque Atual</TableHead>
              <TableHead className="hidden md:table-cell">Estoque Mínimo</TableHead>
              <TableHead className="hidden sm:table-cell">Unidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.productName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {r.categoryName}
                </TableCell>
                <TableCell>
                  <span className="text-destructive font-medium">
                    {fmtDecimal(r.currentStock)}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {fmtDecimal(r.minimumStock)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {UNIT_LABELS[r.unit] ?? r.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
