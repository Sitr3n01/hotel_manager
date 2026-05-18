"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyMessage, InlineTableError } from "@/components/shared/list-parts";
import { ConsumoHospedeDialog } from "@/components/cozinha/consumo-hospede-dialog";
import { deleteReservationConsumption } from "@/lib/actions/reservation-consumption";
import {
  canDeleteReservationConsumption,
  canRegisterReservationConsumption,
  canSeeFinancialValues,
} from "@/lib/permissions";
import { formatDate } from "@/lib/date-format";
import type { Role } from "@prisma/client";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

type Decimalish = string | number | { toString: () => string };

type ReservationLight = {
  id: string;
  guest: { id: string; name: string };
  room: { id: string; number: string; name: string };
};

type ConsumptionRow = {
  id: string;
  description: string;
  quantity: Decimalish;
  unitPrice: Decimalish;
  totalPrice: Decimalish;
  createdAt: Date;
  product: { id: string; name: string; unit: string; category: { name: string } } | null;
  createdBy: { id: string; name: string } | null;
};

type Props = {
  userId: string;
  userRole: Role;
  reservation: ReservationLight;
  consumptions: ConsumptionRow[];
  products: ProductWithCategory[];
};

export function ReservationConsumoTab({
  userId,
  userRole,
  reservation,
  consumptions,
  products,
}: Props) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const canAdd = canRegisterReservationConsumption(userRole);
  const canDelete = canDeleteReservationConsumption(userRole);
  const canSeeValues = canSeeFinancialValues(userRole);

  async function handleDelete(consumption: ConsumptionRow) {
    if (
      !window.confirm(`Estornar consumo "${consumption.description}"? O estoque será devolvido.`)
    ) {
      return;
    }
    setActingId(consumption.id);
    setTableError(null);
    const result = await deleteReservationConsumption(consumption.id);
    setActingId(null);
    if (!result.success) {
      setTableError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <ConsumptionHeader
        canAdd={canAdd}
        canSeeValues={canSeeValues}
        consumptions={consumptions}
        products={products}
        reservation={reservation}
        userId={userId}
        onDone={() => router.refresh()}
      />
      <CardContent className="space-y-3">
        <InlineTableError message={tableError} />
        <ConsumptionContent
          actingId={actingId}
          canAdd={canAdd}
          canDelete={canDelete}
          canSeeValues={canSeeValues}
          consumptions={consumptions}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  );
}

function ConsumptionHeader({
  canAdd,
  canSeeValues,
  consumptions,
  products,
  reservation,
  userId,
  onDone,
}: {
  canAdd: boolean;
  canSeeValues: boolean;
  consumptions: ConsumptionRow[];
  products: ProductWithCategory[];
  reservation: ReservationLight;
  userId: string;
  onDone: () => void;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
      <div>
        <CardTitle className="text-lg">Consumo do hóspede</CardTitle>
        {canSeeValues ? (
          <p className="text-muted-foreground text-sm">
            Total previsto: <strong>R$ {formatMoney(sumTotal(consumptions))}</strong>
          </p>
        ) : null}
      </div>
      {canAdd ? (
        <ConsumoHospedeDialog
          reservations={[reservation]}
          products={products}
          userId={userId}
          defaultReservationId={reservation.id}
          triggerLabel="Adicionar consumo"
          onDone={onDone}
        />
      ) : null}
    </CardHeader>
  );
}

function ConsumptionContent({
  actingId,
  canAdd,
  canDelete,
  canSeeValues,
  consumptions,
  onDelete,
}: {
  actingId: string | null;
  canAdd: boolean;
  canDelete: boolean;
  canSeeValues: boolean;
  consumptions: ConsumptionRow[];
  onDelete: (consumption: ConsumptionRow) => void;
}) {
  if (consumptions.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum consumo registrado nesta reserva."
        hint={canAdd ? 'Use "Adicionar consumo" para começar.' : undefined}
      />
    );
  }

  return (
    <ConsumptionTable
      actingId={actingId}
      canDelete={canDelete}
      canSeeValues={canSeeValues}
      consumptions={consumptions}
      onDelete={onDelete}
    />
  );
}

function ConsumptionTable({
  actingId,
  canDelete,
  canSeeValues,
  consumptions,
  onDelete,
}: {
  actingId: string | null;
  canDelete: boolean;
  canSeeValues: boolean;
  consumptions: ConsumptionRow[];
  onDelete: (consumption: ConsumptionRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Qtd</TableHead>
          {canSeeValues ? <TableHead className="text-right">Unit. (R$)</TableHead> : null}
          {canSeeValues ? <TableHead className="text-right">Total (R$)</TableHead> : null}
          <TableHead>Lançado por</TableHead>
          {canDelete ? <TableHead className="w-1" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {consumptions.map((consumption) => (
          <ConsumptionTableRow
            key={consumption.id}
            acting={actingId === consumption.id}
            canDelete={canDelete}
            canSeeValues={canSeeValues}
            consumption={consumption}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function ConsumptionTableRow({
  acting,
  canDelete,
  canSeeValues,
  consumption,
  onDelete,
}: {
  acting: boolean;
  canDelete: boolean;
  canSeeValues: boolean;
  consumption: ConsumptionRow;
  onDelete: (consumption: ConsumptionRow) => void;
}) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs">
        {formatDate(consumption.createdAt)}
      </TableCell>
      <TableCell className="font-medium">{consumption.description}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {consumption.product ? `${consumption.product.name} (${consumption.product.unit})` : "-"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatDecimal(consumption.quantity)}
      </TableCell>
      {canSeeValues ? <MoneyCell value={consumption.unitPrice} /> : null}
      {canSeeValues ? <MoneyCell value={consumption.totalPrice} /> : null}
      <TableCell className="text-muted-foreground text-xs">
        {consumption.createdBy?.name ?? "-"}
      </TableCell>
      {canDelete ? <DeleteCell acting={acting} onClick={() => onDelete(consumption)} /> : null}
    </TableRow>
  );
}

function MoneyCell({ value }: { value: Decimalish }) {
  return <TableCell className="text-right tabular-nums">{formatMoney(value)}</TableCell>;
}

function DeleteCell({ acting, onClick }: { acting: boolean; onClick: () => void }) {
  return (
    <TableCell>
      <Button size="icon-sm" variant="ghost" disabled={acting} onClick={onClick} title="Estornar">
        {acting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <AlertTriangle className="text-destructive h-4 w-4" />
        )}
      </Button>
    </TableCell>
  );
}

function sumTotal(consumptions: ConsumptionRow[]): number {
  return consumptions.reduce((total, consumption) => total + toNumber(consumption.totalPrice), 0);
}

function formatMoney(value: Decimalish | number): string {
  return toNumber(value).toFixed(2);
}

function formatDecimal(value: Decimalish): string {
  return value.toString();
}

function toNumber(value: Decimalish | number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}
