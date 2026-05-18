"use client";

import { useMemo, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitFooter } from "@/components/shared/submit-footer";
import { InlineTableError } from "@/components/shared/list-parts";
import { QueuedNotice } from "@/components/shared/queued-notice";
import { enqueueOrCreateReservationConsumption } from "@/lib/sync/queue-actions";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

export type ReservationWithLight = {
  id: string;
  guest: { id: string; name: string };
  room: { id: string; number: string; name: string };
};

type Props = {
  reservations: ReservationWithLight[];
  products: ProductWithCategory[];
  userId: string;
  onDone: () => void;
  defaultReservationId?: string;
  triggerLabel?: string;
};

export function ConsumoHospedeDialog({
  reservations,
  products,
  userId,
  onDone,
  defaultReservationId,
  triggerLabel,
}: Props) {
  const form = useConsumptionDialogState(defaultReservationId);
  const selectedProduct = useSelectedProduct(products, form.productId);
  const stockWarning = useStockWarning(selectedProduct, form.quantity);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    form.setServerError(null);
    form.setQueuedNotice(null);
    form.setIsSubmitting(true);
    const result = await enqueueOrCreateReservationConsumption(buildPayload(form), userId);
    form.setIsSubmitting(false);
    if (!result.success) {
      form.setServerError(result.error);
      return;
    }
    if (result.queued) {
      form.setQueuedNotice("Salvo offline. Vai sincronizar quando a internet voltar.");
      onDone();
      return;
    }
    form.setOpen(false);
    form.reset();
    onDone();
  }

  return (
    <Dialog
      open={form.open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        form.setOpen(next);
      }}
    >
      <DialogTrigger render={<Button size="sm" className="w-full" />}>
        <UtensilsCrossed className="h-4 w-4" /> {triggerLabel ?? "Lançar consumo"}
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Consumo do hóspede</DialogTitle>
          <DialogDescription>
            Selecione a reserva, o produto e a quantidade. Entra no fechamento.
          </DialogDescription>
        </DialogHeader>
        <ConsumptionForm
          defaultReservationId={defaultReservationId}
          form={form}
          products={products}
          reservations={reservations}
          stockWarning={stockWarning}
          onProductChange={(id) => handleProductChange(id, products, form)}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConsumptionForm({
  defaultReservationId,
  form,
  products,
  reservations,
  stockWarning,
  onProductChange,
  onSubmit,
}: {
  defaultReservationId?: string;
  form: ConsumptionDialogState;
  products: ProductWithCategory[];
  reservations: ReservationWithLight[];
  stockWarning: string | null;
  onProductChange: (id: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <InlineTableError message={form.serverError} />
      <QueuedNotice message={form.queuedNotice} />
      <StockWarning message={stockWarning} />
      {!defaultReservationId ? (
        <ReservationSelect
          reservations={reservations}
          value={form.reservationId}
          onChange={form.setReservationId}
        />
      ) : null}
      <ProductSelect products={products} value={form.productId} onChange={onProductChange} />
      <DescriptionField value={form.description} onChange={form.setDescription} />
      <ConsumptionNumbers form={form} />
      <SubmitFooter isSubmitting={form.isSubmitting} label="Lançar consumo" />
    </form>
  );
}

function ReservationSelect({
  reservations,
  value,
  onChange,
}: {
  reservations: ReservationWithLight[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Reserva</label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger>
          <SelectValue placeholder={reservations.length ? "Selecione" : "Sem reservas ativas"} />
        </SelectTrigger>
        <SelectContent>
          {reservations.map((reservation) => (
            <SelectItem key={reservation.id} value={reservation.id}>
              {reservation.guest.name} - Quarto {reservation.room.number}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProductSelect({
  products,
  value,
  onChange,
}: {
  products: ProductWithCategory[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Produto</label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione (opcional - pode usar descrição livre)" />
        </SelectTrigger>
        <SelectContent>
          {products
            .filter((product) => product.isActive)
            .map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {formatProductOption(product)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DescriptionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Descrição</label>
      <Textarea
        rows={2}
        placeholder="Ex: Refrigerante lata"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ConsumptionNumbers({ form }: { form: ConsumptionDialogState }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField
        label="Quantidade"
        step="0.001"
        value={form.quantity}
        onChange={form.setQuantity}
      />
      <NumberField
        label="Preço unitário (R$)"
        step="0.01"
        value={form.unitPrice}
        onChange={form.setUnitPrice}
      />
    </div>
  );
}

function NumberField({
  label,
  step,
  value,
  onChange,
}: {
  label: string;
  step: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StockWarning({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
      {message}
    </p>
  );
}

type ConsumptionDialogState = ReturnType<typeof useConsumptionDialogState>;

function useConsumptionDialogState(defaultReservationId?: string) {
  const [open, setOpen] = useState(false);
  const [reservationId, setReservationId] = useState(defaultReservationId ?? "");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [serverError, setServerError] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setReservationId(defaultReservationId ?? "");
    setProductId("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("0");
    setServerError(null);
    setQueuedNotice(null);
    setIsSubmitting(false);
  }

  return {
    description,
    isSubmitting,
    open,
    productId,
    quantity,
    queuedNotice,
    reservationId,
    serverError,
    unitPrice,
    reset,
    setDescription,
    setIsSubmitting,
    setOpen,
    setProductId,
    setQuantity,
    setQueuedNotice,
    setReservationId,
    setServerError,
    setUnitPrice,
  };
}

function useSelectedProduct(products: ProductWithCategory[], productId: string) {
  return useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [products, productId],
  );
}

function useStockWarning(product: ProductWithCategory | null, quantity: string): string | null {
  return useMemo(() => {
    if (!product || !quantity) return null;
    const value = Number(quantity);
    if (!Number.isFinite(value) || value <= 0) return null;
    const projected = Number(product.currentStock) - value;
    if (projected >= 0) return null;
    return `Atenção: estoque de ${product.name} ficará em ${projected.toString()} ${product.unit}.`;
  }, [product, quantity]);
}

function handleProductChange(
  id: string,
  products: ProductWithCategory[],
  form: ConsumptionDialogState,
) {
  form.setProductId(id);
  const product = products.find((item) => item.id === id);
  if (!product) return;
  form.setDescription(product.name);
  if (product.salePrice) form.setUnitPrice(Number(product.salePrice).toFixed(2));
}

function buildPayload(form: ConsumptionDialogState) {
  return {
    reservationId: form.reservationId,
    productId: form.productId || null,
    description: form.description,
    quantity: Number(form.quantity),
    unitPrice: Number(form.unitPrice),
  };
}

function formatProductOption(product: ProductWithCategory): string {
  const base = `${product.name} (${product.unit})`;
  if (!product.salePrice) return base;
  return `${base} - R$ ${Number(product.salePrice).toFixed(2)}`;
}
