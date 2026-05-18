"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  finalizeClosing,
  reopenClosing,
  updatePaymentStatus,
  upsertFinancialClosing,
  type FinancialClosingDetail,
} from "@/lib/actions/financial-closing";
import { canCloseReservation, canEditPaymentStatus, canReopenClosing } from "@/lib/permissions";
import type { PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { FechamentoExportButton } from "@/components/financeiro/fechamento-export-button";

type Props = {
  detail: FinancialClosingDetail;
  userRole: Role;
};

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "PENDING", label: "Pendente" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "PAID", label: "Pago" },
  { value: "CANCELLED", label: "Cancelado" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "DEBIT_CARD", label: "Cartão de débito" },
  { value: "BANK_TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" },
];

export function FechamentoDetailClient({ detail, userRole }: Props) {
  const router = useRouter();
  const [closingId, setClosingId] = useState(detail.closingId);
  const [form, setForm] = useState(() => buildInitialForm(detail));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const isClosed = Boolean(detail.closedAt);
  const totals = useMemo(() => calculatePreviewTotal(detail, form), [detail, form]);

  async function saveClosing() {
    setBusy("save");
    setError("");
    const result = await upsertFinancialClosing(buildInput(detail.reservationId, form));
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return null;
    }
    setClosingId(result.data.id);
    router.refresh();
    return result.data.id;
  }

  async function handleFinalize() {
    const id = closingId ?? (await saveClosing());
    if (!id) return;
    await runMutation("finalize", () => finalizeClosing(id));
  }

  async function handlePaymentOnly() {
    const id = closingId;
    if (!id) {
      await saveClosing();
      return;
    }
    await runMutation("payment", () =>
      updatePaymentStatus(id, form.paymentStatus, form.paymentMethod),
    );
  }

  async function handleReopen() {
    if (!closingId) return;
    const reason = window.prompt("Motivo da reabertura:");
    if (!reason) return;
    await runMutation("reopen", () => reopenClosing(closingId, { reason }));
  }

  async function runMutation(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setBusy(key);
    setError("");
    const result = await action();
    setBusy(null);
    if (!result.success) {
      setError(result.error ?? "Não foi possível concluir a ação");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ClosingHeader detail={detail} closingId={closingId} isClosed={isClosed} />
      <TotalsGrid detail={detail} previewTotal={totals.finalTotal} />
      <ConsumptionCard detail={detail} />
      <ClosingForm
        form={form}
        isClosed={isClosed}
        userRole={userRole}
        busy={busy}
        closingId={closingId}
        onChange={setForm}
        onSave={saveClosing}
        onFinalize={handleFinalize}
        onPaymentOnly={handlePaymentOnly}
        onReopen={handleReopen}
      />
      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
    </div>
  );
}

function ClosingHeader({
  detail,
  closingId,
  isClosed,
}: {
  detail: FinancialClosingDetail;
  closingId: string | null;
  isClosed: boolean;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Fechamento da estadia</h1>
        <p className="text-muted-foreground text-sm">
          {detail.guestName} · quarto {detail.roomNumber} · {formatDate(detail.checkInDate)} a{" "}
          {formatDate(detail.checkOutDate)}
        </p>
      </div>
      {closingId ? <FechamentoExportButton closingId={closingId} disabled={!isClosed} /> : null}
    </header>
  );
}

function TotalsGrid({
  detail,
  previewTotal,
}: {
  detail: FinancialClosingDetail;
  previewTotal: number;
}) {
  const items = [
    ["Noites", String(detail.nights)],
    ["Diárias", formatCurrency(detail.dailyTotal)],
    ["Consumo", formatCurrency(detail.consumptionTotal)],
    ["Total final", formatCurrency(previewTotal)],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="elevation-1 border-border/60">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-lg font-medium tabular-nums">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConsumptionCard({ detail }: { detail: FinancialClosingDetail }) {
  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="space-y-3 p-5">
        <h2 className="text-base font-medium">Consumos vinculados</h2>
        {detail.consumptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum consumo lançado para a reserva.</p>
        ) : (
          <div className="space-y-2">
            {detail.consumptions.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span>{item.description || item.productName}</span>
                <span className="tabular-nums">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClosingForm({
  form,
  isClosed,
  userRole,
  busy,
  closingId,
  onChange,
  onSave,
  onFinalize,
  onPaymentOnly,
  onReopen,
}: {
  form: ClosingFormState;
  isClosed: boolean;
  userRole: Role;
  busy: string | null;
  closingId: string | null;
  onChange: (form: ClosingFormState) => void;
  onSave: () => Promise<string | null>;
  onFinalize: () => Promise<void>;
  onPaymentOnly: () => Promise<void>;
  onReopen: () => Promise<void>;
}) {
  const canEdit = canCloseReservation(userRole) && !isClosed;
  const canEditPayment = canEditPaymentStatus(userRole);
  const canReopen = canReopenClosing(userRole) && isClosed && closingId;

  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="space-y-4 p-5">
        {isClosed ? <ClosedNotice /> : null}
        <MoneyFields form={form} disabled={!canEdit} onChange={onChange} />
        <PaymentFields
          form={form}
          disabled={!canEditPayment}
          onChange={onChange}
        />
        <FormActions
          busy={busy}
          canEdit={canEdit}
          canEditPayment={canEditPayment}
          canReopen={Boolean(canReopen)}
          isClosed={isClosed}
          onFinalize={onFinalize}
          onPaymentOnly={onPaymentOnly}
          onReopen={onReopen}
          onSave={onSave}
        />
      </CardContent>
    </Card>
  );
}

function MoneyFields({
  form,
  disabled,
  onChange,
}: {
  form: ClosingFormState;
  disabled: boolean;
  onChange: (form: ClosingFormState) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MoneyField label="Desconto" value={form.discountTotal} disabled={disabled} onChange={(v) => onChange({ ...form, discountTotal: v })} />
      <MoneyField label="Acréscimo" value={form.extraTotal} disabled={disabled} onChange={(v) => onChange({ ...form, extraTotal: v })} />
      <TextareaField label="Justificativa do desconto" value={form.discountJustification} disabled={disabled} onChange={(v) => onChange({ ...form, discountJustification: v })} />
      <TextareaField label="Justificativa do acréscimo" value={form.extraJustification} disabled={disabled} onChange={(v) => onChange({ ...form, extraJustification: v })} />
    </div>
  );
}

function PaymentFields({
  form,
  disabled,
  onChange,
}: {
  form: ClosingFormState;
  disabled: boolean;
  onChange: (form: ClosingFormState) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Status de pagamento</Label>
        <Select
          value={form.paymentStatus}
          onValueChange={(value) => onChange({ ...form, paymentStatus: value as PaymentStatus })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Método</Label>
        <Select
          value={form.paymentMethod ?? "NONE"}
          onValueChange={(value) =>
            onChange({ ...form, paymentMethod: value === "NONE" ? null : (value as PaymentMethod) })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Não definido</SelectItem>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FormActions({
  busy,
  canEdit,
  canEditPayment,
  canReopen,
  isClosed,
  onFinalize,
  onPaymentOnly,
  onReopen,
  onSave,
}: {
  busy: string | null;
  canEdit: boolean;
  canEditPayment: boolean;
  canReopen: boolean;
  isClosed: boolean;
  onFinalize: () => Promise<void>;
  onPaymentOnly: () => Promise<void>;
  onReopen: () => Promise<void>;
  onSave: () => Promise<string | null>;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      {canEditPayment ? <ActionButton busy={busy === "payment"} icon={Save} label="Salvar pagamento" onClick={onPaymentOnly} /> : null}
      {canEdit ? <ActionButton busy={busy === "save"} icon={Save} label="Salvar cálculo" onClick={onSave} /> : null}
      {canEdit ? <ActionButton busy={busy === "finalize"} icon={ShieldCheck} label="Finalizar" onClick={onFinalize} /> : null}
      {canReopen ? <ActionButton busy={busy === "reopen"} icon={RotateCcw} label="Reabrir" onClick={onReopen} /> : null}
      {!canEdit && !canEditPayment && !canReopen && isClosed ? <Lock className="text-muted-foreground h-4 w-4" /> : null}
    </div>
  );
}

function ActionButton({
  busy,
  icon: Icon,
  label,
  onClick,
}: {
  busy: boolean;
  icon: typeof Save;
  label: string;
  onClick: () => Promise<unknown>;
}) {
  return (
    <Button type="button" disabled={busy} onClick={() => void onClick()}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}

function ClosedNotice() {
  return (
    <p className="bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm">
      <Lock className="h-4 w-4" />
      Fechamento finalizado. Reabra com gerência/admin para alterar valores.
    </p>
  );
}

function MoneyField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        disabled={disabled}
        min={0}
        step="0.01"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        disabled={disabled}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type ClosingFormState = {
  discountTotal: number;
  extraTotal: number;
  discountJustification: string;
  extraJustification: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
};

function buildInitialForm(detail: FinancialClosingDetail): ClosingFormState {
  return {
    discountTotal: detail.discountTotal,
    extraTotal: detail.extraTotal,
    discountJustification: detail.discountJustification ?? "",
    extraJustification: detail.extraJustification ?? "",
    paymentStatus: detail.paymentStatus,
    paymentMethod: detail.paymentMethod,
  };
}

function buildInput(reservationId: string, form: ClosingFormState) {
  return {
    reservationId,
    discountTotal: form.discountTotal,
    extraTotal: form.extraTotal,
    discountJustification: form.discountJustification,
    extraJustification: form.extraJustification,
    paymentStatus: form.paymentStatus,
    paymentMethod: form.paymentMethod,
  };
}

function calculatePreviewTotal(detail: FinancialClosingDetail, form: ClosingFormState) {
  const finalTotal = Math.max(
    detail.dailyTotal + detail.consumptionTotal - form.discountTotal + form.extraTotal,
    0,
  );
  return { finalTotal };
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
