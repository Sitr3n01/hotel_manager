"use client";

import { useState } from "react";
import { CloudOff } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineTableError } from "@/components/shared/list-parts";
import { QueuedNotice } from "@/components/shared/queued-notice";
import { SubmitFooter } from "@/components/shared/submit-footer";
import { enqueuePreReservation } from "@/lib/sync/queue-actions";
import type { RoomWithTypeForClient } from "@/lib/client-serialization";

type Props = {
  rooms: RoomWithTypeForClient[];
  userId: string;
  onDone: () => void;
};

type FormState = {
  roomId: string;
  guestName: string;
  guestPhone: string;
  guestDocument: string;
  checkInDate: string;
  checkOutDate: string;
  adults: string;
  children: string;
  dailyRate: string;
  notes: string;
};

const EMPTY: FormState = {
  roomId: "",
  guestName: "",
  guestPhone: "",
  guestDocument: "",
  checkInDate: "",
  checkOutDate: "",
  adults: "1",
  children: "0",
  dailyRate: "0",
  notes: "",
};

export function PreReservaOfflineDialog({ rooms, userId, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [serverError, setServerError] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setForm({ ...EMPTY });
    setServerError(null);
    setQueuedNotice(null);
    setSubmitting(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    setQueuedNotice(null);
    const validation = validate(form);
    if (validation) {
      setServerError(validation);
      return;
    }
    setSubmitting(true);
    const result = await enqueuePreReservation(buildPayload(form), userId);
    setSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setQueuedNotice(
      "Pré-reserva enfileirada. Vai validar conflito de quarto na sincronização.",
    );
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CloudOff className="h-4 w-4" /> Pré-reserva offline
      </DialogTrigger>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pré-reserva offline</DialogTitle>
          <DialogDescription>
            Use quando estiver sem internet. Conflito de quarto é checado só na sincronização.
          </DialogDescription>
        </DialogHeader>
        <PreReservaForm
          form={form}
          rooms={rooms}
          submitting={submitting}
          serverError={serverError}
          queuedNotice={queuedNotice}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}

function PreReservaForm({
  form,
  rooms,
  submitting,
  serverError,
  queuedNotice,
  onChange,
  onSubmit,
}: {
  form: FormState;
  rooms: RoomWithTypeForClient[];
  submitting: boolean;
  serverError: string | null;
  queuedNotice: string | null;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <InlineTableError message={serverError} />
      <QueuedNotice message={queuedNotice} />
      <RoomField rooms={rooms} value={form.roomId} onChange={(v) => onChange({ roomId: v })} />
      <GuestFields form={form} onChange={onChange} />
      <DateFields form={form} onChange={onChange} />
      <NumberFields form={form} onChange={onChange} />
      <NotesField value={form.notes} onChange={(v) => onChange({ notes: v })} />
      <SubmitFooter isSubmitting={submitting} label="Enfileirar pré-reserva" />
    </form>
  );
}

function RoomField({
  rooms,
  value,
  onChange,
}: {
  rooms: RoomWithTypeForClient[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Quarto</label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um quarto" />
        </SelectTrigger>
        <SelectContent>
          {rooms
            .filter((r) => r.isActive)
            .map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.number} — {r.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GuestFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <LabeledInput
        label="Nome do hóspede"
        value={form.guestName}
        onChange={(v) => onChange({ guestName: v })}
        className="sm:col-span-3"
      />
      <LabeledInput
        label="Telefone"
        value={form.guestPhone}
        onChange={(v) => onChange({ guestPhone: v })}
      />
      <LabeledInput
        label="Documento"
        value={form.guestDocument}
        onChange={(v) => onChange({ guestDocument: v })}
        className="sm:col-span-2"
      />
    </div>
  );
}

function DateFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <LabeledInput
        label="Check-in"
        type="date"
        value={form.checkInDate}
        onChange={(v) => onChange({ checkInDate: v })}
      />
      <LabeledInput
        label="Check-out"
        type="date"
        value={form.checkOutDate}
        onChange={(v) => onChange({ checkOutDate: v })}
      />
    </div>
  );
}

function NumberFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <LabeledInput
        label="Adultos"
        type="number"
        min="1"
        value={form.adults}
        onChange={(v) => onChange({ adults: v })}
      />
      <LabeledInput
        label="Crianças"
        type="number"
        min="0"
        value={form.children}
        onChange={(v) => onChange({ children: v })}
      />
      <LabeledInput
        label="Diária (R$)"
        type="number"
        step="0.01"
        min="0"
        value={form.dailyRate}
        onChange={(v) => onChange({ dailyRate: v })}
      />
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NotesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Observações (opcional)</label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function validate(form: FormState): string | null {
  if (!form.roomId) return "Selecione um quarto";
  if (!form.guestName.trim()) return "Informe o nome do hóspede";
  if (!form.checkInDate || !form.checkOutDate) return "Informe as datas de check-in e check-out";
  if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) {
    return "Check-out deve ser depois do check-in";
  }
  const adults = Number(form.adults);
  if (!Number.isFinite(adults) || adults < 1) return "Pelo menos 1 adulto";
  const dailyRate = Number(form.dailyRate);
  if (!Number.isFinite(dailyRate) || dailyRate < 0) return "Diária inválida";
  return null;
}

function buildPayload(form: FormState) {
  return {
    roomId: form.roomId,
    guestName: form.guestName.trim(),
    guestPhone: form.guestPhone.trim() || null,
    guestDocument: form.guestDocument.trim() || null,
    checkInDate: new Date(form.checkInDate).toISOString(),
    checkOutDate: new Date(form.checkOutDate).toISOString(),
    adults: Number(form.adults),
    children: Number(form.children),
    dailyRate: Number(form.dailyRate),
    discountAmount: 0,
    notes: form.notes.trim() || null,
  };
}
