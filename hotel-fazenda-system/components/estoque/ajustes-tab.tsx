"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyMessage, InlineTableError } from "@/components/shared/list-parts";
import { SubmitFooter } from "@/components/shared/submit-footer";
import {
  QuantityField,
  ReasonField,
  StockProductSelect,
} from "@/components/shared/stock-movement-fields";
import { createAdjustment } from "@/lib/actions/stock-movement";
import { formatDate } from "@/lib/date-format";
import type { Role } from "@prisma/client";
import type { MovementWithRelations } from "@/components/estoque/movimentacoes-tab";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

export function AjustesTab({
  movements,
  products,
}: {
  userRole: Role;
  movements: MovementWithRelations[];
  products: ProductWithCategory[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AjusteDialog products={products} onDone={() => router.refresh()} />
      </div>
      <AdjustmentsTable movements={movements} />
    </div>
  );
}

function AdjustmentsTable({ movements }: { movements: MovementWithRelations[] }) {
  if (movements.length === 0) {
    return (
      <EmptyMessage
        message="Nenhum ajuste registrado."
        hint="Ajustes só devem ser usados para corrigir o estoque vs realidade."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Direção</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Qtd</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Responsável</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => (
          <AdjustmentRow key={movement.id} movement={movement} />
        ))}
      </TableBody>
    </Table>
  );
}

function AdjustmentRow({ movement }: { movement: MovementWithRelations }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs">
        {formatDate(movement.createdAt)}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
          {movement.type === "POSITIVE_ADJUSTMENT" ? "+" : "-"}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">{movement.product.name}</TableCell>
      <TableCell className="text-right tabular-nums">
        {movement.quantity} {movement.product.unit}
      </TableCell>
      <TableCell className="text-sm">{movement.reason ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {movement.createdBy?.name ?? "-"}
      </TableCell>
    </TableRow>
  );
}

function AjusteDialog({
  products,
  onDone,
}: {
  products: ProductWithCategory[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"POSITIVE" | "NEGATIVE">("POSITIVE");
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setProductId("");
    setQuantity("");
    setDirection("POSITIVE");
    setReason("");
    setServerError(null);
    setIsSubmitting(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    setIsSubmitting(true);
    const result = await createAdjustment({
      productId,
      quantity: Number(quantity),
      direction,
      reason,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setOpen(false);
    reset();
    onDone();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <AdjustmentDialogTrigger />
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuste manual de estoque</DialogTitle>
          <DialogDescription>
            Use para corrigir divergência entre sistema e contagem física. Motivo é obrigatório.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <InlineTableError message={serverError} />
          <StockProductSelect products={products} value={productId} onChange={setProductId} />
          <AdjustmentDirectionField
            value={direction}
            onChange={setDirection}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          <ReasonField
            label="Motivo (obrigatório)"
            placeholder="Ex: Recontagem física de 17/05"
            rows={3}
            value={reason}
            onChange={setReason}
          />
          <SubmitFooter isSubmitting={isSubmitting} label="Registrar ajuste" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustmentDialogTrigger() {
  return (
    <DialogTrigger render={<Button size="sm" />}>
      <Plus className="h-4 w-4" /> Novo ajuste
    </DialogTrigger>
  );
}

function AdjustmentDirectionField({
  value,
  onChange,
  quantity,
  onQuantityChange,
}: {
  value: "POSITIVE" | "NEGATIVE";
  onChange: (value: "POSITIVE" | "NEGATIVE") => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <label className="text-sm font-medium">Direção</label>
        <Select value={value} onValueChange={(next) => next && onChange(next as typeof value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POSITIVE">+ Sobrou (adicionar)</SelectItem>
            <SelectItem value="NEGATIVE">- Faltou (subtrair)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <QuantityField value={quantity} onChange={onQuantityChange} />
    </div>
  );
}
