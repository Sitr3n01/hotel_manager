"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
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
import { InlineTableError } from "@/components/shared/list-parts";
import { QueuedNotice } from "@/components/shared/queued-notice";
import { SubmitFooter } from "@/components/shared/submit-footer";

export type StockProductOption = {
  id: string;
  name: string;
  unit: string;
  isActive: boolean;
  currentStock?: { toString: () => string };
};

type ButtonVariant = ComponentProps<typeof Button>["variant"];

type MovementInput = {
  productId: string;
  quantity: number;
  reason: string | null;
};

type MovementResult =
  | { success: true; queued?: boolean }
  | { success: false; error: string };

type SimpleStockMovementDialogProps = {
  products: StockProductOption[];
  onDone: () => void;
  createMovement: (input: MovementInput) => Promise<MovementResult>;
  icon: ReactNode;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonRequired?: boolean;
  showStock?: boolean;
  submitLabel: string;
};

export function SimpleStockMovementDialog({
  products,
  onDone,
  createMovement,
  icon,
  triggerLabel,
  triggerVariant = "outline",
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  reasonRequired = false,
  showStock = false,
  submitLabel,
}: SimpleStockMovementDialogProps) {
  const state = useSimpleMovementState();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    state.setServerError(null);
    state.setQueuedNotice(null);
    state.setIsSubmitting(true);
    const result = await createMovement({
      productId: state.productId,
      quantity: Number(state.quantity),
      reason: reasonRequired ? state.reason : state.reason || null,
    });
    state.setIsSubmitting(false);
    if (!result.success) {
      state.setServerError(result.error);
      return;
    }
    if (result.queued) {
      state.setQueuedNotice(
        "Salvo offline. Vai sincronizar quando a internet voltar.",
      );
      onDone();
      return;
    }
    state.setOpen(false);
    state.reset();
    onDone();
  }

  return (
    <Dialog
      open={state.open}
      onOpenChange={(next) => {
        if (!next) state.reset();
        state.setOpen(next);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} className="w-full" />}>
        {icon} {triggerLabel}
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <SimpleMovementForm
          isSubmitting={state.isSubmitting}
          productId={state.productId}
          products={products}
          quantity={state.quantity}
          queuedNotice={state.queuedNotice}
          reason={state.reason}
          reasonLabel={reasonLabel}
          reasonPlaceholder={reasonPlaceholder}
          serverError={state.serverError}
          showStock={showStock}
          submitLabel={submitLabel}
          onProductChange={state.setProductId}
          onQuantityChange={state.setQuantity}
          onReasonChange={state.setReason}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}

function useSimpleMovementState() {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setProductId("");
    setQuantity("");
    setReason("");
    setServerError(null);
    setQueuedNotice(null);
    setIsSubmitting(false);
  }

  return {
    isSubmitting,
    open,
    productId,
    quantity,
    queuedNotice,
    reason,
    serverError,
    reset,
    setIsSubmitting,
    setOpen,
    setProductId,
    setQuantity,
    setQueuedNotice,
    setReason,
    setServerError,
  };
}

function SimpleMovementForm({
  isSubmitting,
  productId,
  products,
  quantity,
  queuedNotice,
  reason,
  reasonLabel,
  reasonPlaceholder,
  serverError,
  showStock,
  submitLabel,
  onProductChange,
  onQuantityChange,
  onReasonChange,
  onSubmit,
}: {
  isSubmitting: boolean;
  productId: string;
  products: StockProductOption[];
  quantity: string;
  queuedNotice: string | null;
  reason: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  serverError: string | null;
  showStock: boolean;
  submitLabel: string;
  onProductChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <InlineTableError message={serverError} />
      <QueuedNotice message={queuedNotice} />
      <StockProductSelect
        products={products}
        value={productId}
        onChange={onProductChange}
        showStock={showStock}
      />
      <QuantityField value={quantity} onChange={onQuantityChange} />
      <ReasonField
        label={reasonLabel}
        placeholder={reasonPlaceholder}
        rows={2}
        value={reason}
        onChange={onReasonChange}
      />
      <SubmitFooter isSubmitting={isSubmitting} label={submitLabel} />
    </form>
  );
}


export function StockProductSelect({
  products,
  value,
  onChange,
  showStock = false,
  placeholder = "Selecione",
}: {
  products: StockProductOption[];
  value: string;
  onChange: (id: string) => void;
  showStock?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Produto</label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {products.filter(isActiveProduct).map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {formatProductOption(product, showStock)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function QuantityField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Quantidade</label>
      <Input
        type="number"
        step="0.001"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ReasonField({
  label,
  placeholder,
  rows = 2,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  rows?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Textarea
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function isActiveProduct(product: StockProductOption): boolean {
  return product.isActive;
}

function formatProductOption(product: StockProductOption, showStock: boolean): string {
  const base = `${product.name} (${product.unit})`;
  if (!showStock || !product.currentStock) return base;
  return `${base} - estoque: ${product.currentStock.toString()}`;
}
