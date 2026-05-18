"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { SubmitFooter } from "@/components/shared/submit-footer";
import { QueuedNotice } from "@/components/shared/queued-notice";
import { enqueueOrCreatePurchase } from "@/lib/sync/queue-actions";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

type Item = { productId: string; quantity: string; totalCost: string };

const EMPTY: Item = { productId: "", quantity: "", totalCost: "" };

export function EntradaBatchDialog({
  products,
  userId,
  onDone,
}: {
  products: ProductWithCategory[];
  userId: string;
  onDone: () => void;
}) {
  const state = useEntradaBatchState(userId, onDone);
  return (
    <Dialog
      open={state.open}
      onOpenChange={(next) => {
        if (!next) state.reset();
        state.setOpen(next);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" />
        Nova entrada (compra)
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova entrada de produtos</DialogTitle>
          <DialogDescription>
            Adicione todos os itens da compra. O custo médio é recalculado por produto.
          </DialogDescription>
        </DialogHeader>
        <PurchaseForm
          isSubmitting={state.isSubmitting}
          items={state.items}
          products={products}
          queuedNotice={state.queuedNotice}
          reason={state.reason}
          serverError={state.serverError}
          onAddItem={() => state.setItems((prev) => [...prev, { ...EMPTY }])}
          onItemChange={(index, patch) => updateItem(state.setItems, index, patch)}
          onReasonChange={state.setReason}
          onRemoveItem={(index) => removeItem(state.setItems, index)}
          onSubmit={state.submit}
        />
      </DialogContent>
    </Dialog>
  );
}

function useEntradaBatchState(userId: string, onDone: () => void) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ ...EMPTY }]);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setItems([{ ...EMPTY }]);
    setReason("");
    setServerError(null);
    setQueuedNotice(null);
    setIsSubmitting(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    setQueuedNotice(null);
    const parsed = parseItems(items);
    if (parsed.length === 0) {
      setServerError("Adicione pelo menos um item válido.");
      return;
    }
    setIsSubmitting(true);
    const result = await enqueueOrCreatePurchase(
      { items: parsed, reason: reason || null },
      userId,
    );
    setIsSubmitting(false);
    if (!result.success) return setServerError(result.error);
    if (result.queued) {
      setQueuedNotice("Salvo offline. Vai sincronizar quando a internet voltar.");
      onDone();
      return;
    }
    setOpen(false);
    reset();
    onDone();
  }

  return {
    open, items, reason, serverError, queuedNotice, isSubmitting,
    setOpen, setItems, setReason, reset, submit,
  };
}

function PurchaseForm({
  isSubmitting,
  items,
  products,
  queuedNotice,
  reason,
  serverError,
  onAddItem,
  onItemChange,
  onReasonChange,
  onRemoveItem,
  onSubmit,
}: {
  isSubmitting: boolean;
  items: Item[];
  products: ProductWithCategory[];
  queuedNotice: string | null;
  reason: string;
  serverError: string | null;
  onAddItem: () => void;
  onItemChange: (index: number, patch: Partial<Item>) => void;
  onReasonChange: (value: string) => void;
  onRemoveItem: (index: number) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PurchaseItemsField
        items={items}
        products={products}
        onAddItem={onAddItem}
        onItemChange={onItemChange}
        onRemoveItem={onRemoveItem}
      />
      <PurchaseReasonField value={reason} onChange={onReasonChange} />
      {serverError ? (
        <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
          {serverError}
        </p>
      ) : null}
      <QueuedNotice message={queuedNotice} />
      <SubmitFooter isSubmitting={isSubmitting} label="Registrar entrada" />
    </form>
  );
}

function PurchaseItemsField({
  items,
  products,
  onAddItem,
  onItemChange,
  onRemoveItem,
}: {
  items: Item[];
  products: ProductWithCategory[];
  onAddItem: () => void;
  onItemChange: (index: number, patch: Partial<Item>) => void;
  onRemoveItem: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <ItemRow
          key={index}
          item={item}
          products={products}
          canRemove={items.length > 1}
          onChange={(patch) => onItemChange(index, patch)}
          onRemove={() => onRemoveItem(index)}
        />
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onAddItem}
        disabled={items.length >= 50}
      >
        <Plus className="h-4 w-4" /> Adicionar item
      </Button>
    </div>
  );
}

function PurchaseReasonField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Observação (opcional)</label>
      <Input
        placeholder="Ex: Compra Atacadão 17/05"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ItemRow({
  item,
  products,
  canRemove,
  onChange,
  onRemove,
}: {
  item: Item;
  products: ProductWithCategory[];
  canRemove: boolean;
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-md border p-2">
      <ProductCell item={item} products={products} onChange={onChange} />
      <NumberCell
        label="Quantidade"
        step="0.001"
        value={item.quantity}
        onChange={(quantity) => onChange({ quantity })}
      />
      <NumberCell
        label="Custo total (R$)"
        step="0.01"
        value={item.totalCost}
        onChange={(totalCost) => onChange({ totalCost })}
      />
      <div className="col-span-1 flex justify-end">
        {canRemove ? <RemoveItemButton onClick={onRemove} /> : null}
      </div>
    </div>
  );
}

function ProductCell({
  item,
  products,
  onChange,
}: {
  item: Item;
  products: ProductWithCategory[];
  onChange: (patch: Partial<Item>) => void;
}) {
  return (
    <div className="col-span-5 space-y-1">
      <label className="text-muted-foreground text-xs">Produto</label>
      <Select
        value={item.productId}
        onValueChange={(value) => onChange({ productId: value ?? "" })}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {products
            .filter((product) => product.isActive)
            .map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} ({product.unit})
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberCell({
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
    <div className="col-span-3 space-y-1">
      <label className="text-muted-foreground text-xs">{label}</label>
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

function RemoveItemButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="icon-sm" variant="ghost" onClick={onClick} title="Remover">
      <Trash2 className="text-destructive h-4 w-4" />
    </Button>
  );
}

function parseItems(items: Item[]) {
  return items
    .filter((item) => item.productId)
    .map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      totalCost: Number(item.totalCost),
    }));
}

function updateItem(
  setItems: React.Dispatch<React.SetStateAction<Item[]>>,
  index: number,
  patch: Partial<Item>,
) {
  setItems((prev) =>
    prev.map((item, current) => (current === index ? { ...item, ...patch } : item)),
  );
}

function removeItem(setItems: React.Dispatch<React.SetStateAction<Item[]>>, index: number) {
  setItems((prev) => prev.filter((_, current) => current !== index));
}
