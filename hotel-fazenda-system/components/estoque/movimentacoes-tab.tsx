"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyMessage } from "@/components/shared/list-parts";
import { EntradaBatchDialog } from "@/components/estoque/entrada-batch-dialog";
import { canRegisterPurchase } from "@/lib/permissions";
import { formatDate } from "@/lib/date-format";
import type { MovementType, Role } from "@prisma/client";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";
import type { MovementForClient } from "@/lib/client-serialization";

export type MovementWithRelations = MovementForClient;

const TYPE_LABEL: Record<MovementType, string> = {
  IN: "Entrada",
  RESERVATION_CONSUMPTION: "Consumo Hóspede",
  INTERNAL_CONSUMPTION: "Consumo Interno",
  WASTE: "Desperdício",
  POSITIVE_ADJUSTMENT: "Ajuste +",
  NEGATIVE_ADJUSTMENT: "Ajuste −",
};

const TYPE_COLOR: Record<MovementType, string> = {
  IN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  RESERVATION_CONSUMPTION: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  INTERNAL_CONSUMPTION: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  WASTE: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  POSITIVE_ADJUSTMENT: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  NEGATIVE_ADJUSTMENT: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export function MovimentacoesTab({
  userId,
  userRole,
  movements,
  products,
}: {
  userId: string;
  userRole: Role;
  movements: MovementWithRelations[];
  products: ProductWithCategory[];
}) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<MovementType | "ALL">("ALL");
  const filtered = useMemo(
    () => (typeFilter === "ALL" ? movements : movements.filter((m) => m.type === typeFilter)),
    [movements, typeFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground text-sm">Tipo:</label>
          <Select
            value={typeFilter}
            onValueChange={(v) => v && setTypeFilter(v as MovementType | "ALL")}
          >
            <SelectTrigger className="h-9 w-48 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canRegisterPurchase(userRole) ? (
          <EntradaBatchDialog
            products={products}
            userId={userId}
            onDone={() => router.refresh()}
          />
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyMessage
          message="Nenhuma movimentação ainda."
          hint="Registre uma compra (Entrada) para começar."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Custo (R$)</TableHead>
              <TableHead>Motivo / Reserva</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <MovementRow key={m.id} movement={m} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function MovementRow({ movement }: { movement: MovementWithRelations }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
        {formatDate(movement.createdAt)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={TYPE_COLOR[movement.type]}>
          {TYPE_LABEL[movement.type]}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        {movement.product.name}
        <p className="text-muted-foreground text-xs">{movement.product.category.name}</p>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {movement.quantity} {movement.product.unit}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoney(movement.estimatedCost)}
      </TableCell>
      <TableCell className="text-sm">
        {movement.reservation ? (
          <span>Reserva — {movement.reservation.guest.name}</span>
        ) : (
          (movement.reason ?? "—")
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {movement.createdBy?.name ?? "—"}
      </TableCell>
    </TableRow>
  );
}

function formatMoney(value: string): string {
  return Number(value).toFixed(2);
}
