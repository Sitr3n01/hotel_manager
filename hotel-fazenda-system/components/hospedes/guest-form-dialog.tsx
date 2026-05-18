"use client";

import { useState } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitFooter } from "@/components/shared/submit-footer";
import { TextField } from "@/components/shared/text-field";
import { createGuest, updateGuest } from "@/lib/actions/guest";
import { createGuestSchema, type CreateGuestInput } from "@/lib/validations/guest";
import type { Guest } from "@prisma/client";
import type { z } from "zod";

type FormValues = z.input<typeof createGuestSchema>;

type Props =
  | { mode: "create"; onDone: () => void }
  | { mode: "edit"; guest: Guest; onDone: () => void };

export function GuestFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = props.mode === "edit";
  const form = useGuestForm(props);

  async function onSubmit(values: CreateGuestInput) {
    setServerError(null);
    setIsSubmitting(true);
    const result = isEdit ? await updateGuest(props.guest.id, values) : await createGuest(values);
    setIsSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setOpen(false);
    form.reset(getGuestDefaultValues(props));
    props.onDone();
  }

  function onOpenChange(next: boolean) {
    if (!next) {
      form.reset(getGuestDefaultValues(props));
      setServerError(null);
      setIsSubmitting(false);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <GuestDialogTrigger isEdit={isEdit} />
      <DialogContent showCloseButton className="sm:max-w-md">
        <GuestDialogHeader isEdit={isEdit} />
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <GuestFields errors={form.formState.errors} register={form.register} />
          {serverError ? <FormError message={serverError} /> : null}
          <SubmitFooter
            isSubmitting={isSubmitting}
            label={isEdit ? "Salvar alterações" : "Criar hóspede"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GuestDialogTrigger({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogTrigger
      render={
        isEdit ? <Button size="icon-sm" variant="ghost" title="Editar" /> : <Button size="sm" />
      }
    >
      {isEdit ? (
        <Pencil className="h-4 w-4" />
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Novo hóspede
        </>
      )}
    </DialogTrigger>
  );
}

function GuestDialogHeader({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? "Editar hóspede" : "Novo hóspede"}</DialogTitle>
      <DialogDescription>
        {isEdit
          ? "Altere os dados do hóspede."
          : "Preencha os dados para cadastrar um novo hóspede."}
      </DialogDescription>
    </DialogHeader>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
      role="alert"
    >
      {message}
    </p>
  );
}

function GuestFields({
  errors,
  register,
}: {
  errors: FieldErrors<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  return (
    <>
      <TextField
        label="Nome"
        placeholder="Nome completo"
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Documento"
          placeholder="CPF, RG ou passaporte"
          error={errors.document?.message}
          {...register("document")}
        />
        <TextField
          label="Telefone"
          placeholder="(11) 99999-9999"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <TextField
        label="Email"
        type="email"
        placeholder="email@exemplo.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <NotesField errors={errors} register={register} />
    </>
  );
}

function NotesField({
  errors,
  register,
}: {
  errors: FieldErrors<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Observações</label>
      <Textarea
        rows={3}
        placeholder="Observações opcionais sobre o hóspede"
        aria-invalid={!!errors.notes?.message}
        {...register("notes")}
      />
      {errors.notes?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {errors.notes.message}
        </p>
      ) : null}
    </div>
  );
}

function useGuestForm(props: Props): UseFormReturn<FormValues, unknown, CreateGuestInput> {
  return useForm<FormValues, unknown, CreateGuestInput>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: getGuestDefaultValues(props),
  });
}

function getGuestDefaultValues(props: Props): FormValues {
  if (props.mode === "create") {
    return { name: "", phone: "", document: "", email: "", notes: "" };
  }

  return {
    name: props.guest.name,
    phone: props.guest.phone ?? "",
    document: props.guest.document ?? "",
    email: props.guest.email ?? "",
    notes: props.guest.notes ?? "",
  };
}
