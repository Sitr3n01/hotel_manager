import { TableCell, TableHead } from "@/components/ui/table";
import { formatDate } from "@/lib/date-format";
import { formatCurrency, formatDecimal, textOrDash, type NumberLike } from "./report-formatters";

type MovementDetailCellsProps = {
  quantity: NumberLike;
  estimatedCost: NumberLike;
  reason: string | null;
  createdAt: Date;
  createdByName: string | null;
  quantityClassName?: string;
};

export function MovementDetailHeaderCells({
  quantityClassName = "",
}: {
  quantityClassName?: string;
}) {
  return (
    <>
      <TableHead className={quantityClassName}>Qtd</TableHead>
      <TableHead className="hidden md:table-cell">Custo</TableHead>
      <TableHead className="hidden lg:table-cell">Motivo</TableHead>
      <TableHead className="hidden sm:table-cell">Data</TableHead>
      <TableHead className="hidden md:table-cell">Responsavel</TableHead>
    </>
  );
}

export function MovementDetailCells({
  quantity,
  estimatedCost,
  reason,
  createdAt,
  createdByName,
  quantityClassName = "",
}: MovementDetailCellsProps) {
  return (
    <>
      <TableCell className={quantityClassName}>{formatDecimal(quantity)}</TableCell>
      <TableCell className="hidden md:table-cell">{formatCurrency(estimatedCost)}</TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">
        {textOrDash(reason)}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatDate(createdAt)}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {textOrDash(createdByName)}
      </TableCell>
    </>
  );
}
