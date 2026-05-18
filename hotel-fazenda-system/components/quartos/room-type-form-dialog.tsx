"use client";

import { useState } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextField } from "@/components/shared/text-field";
import {
  DialogActionTrigger,
  ServerErrorMessage,
  SubmitFooter,
} from "@/components/quartos/room-dialog-parts";
import { createRoomType, updateRoomType } from "@/lib/actions/room-type";
import { createRoomTypeSchema, type CreateRoomTypeInput } from "@/lib/validations/room-type";
import type { RoomTypeForClient } from "@/lib/client-serialization";
import type { z } from "zod";

type RoomTypeFormValues = z.input<typeof createRoomTypeSchema>;

type Props =
  | { mode: "create"; onDone: () => void }
  | { mode: "edit"; roomType: RoomTypeForClient; onDone: () => void };

export function RoomTypeFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = props.mode === "edit";
  const form = useRoomTypeForm(props);

  async function onSubmit(values: CreateRoomTypeInput) {
    setServerError(null);
    setIsSubmitting(true);

    const result = isEdit
      ? await updateRoomType(props.roomType.id, values)
      : await createRoomType(values);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    form.reset(getRoomTypeDefaultValues(props));
    props.onDone();
  }

  function onOpenChange(next: boolean) {
    if (!next) {
      form.reset(getRoomTypeDefaultValues(props));
      setServerError(null);
      setIsSubmitting(false);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogActionTrigger isEdit={isEdit} createLabel="Novo tipo de quarto" />
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo de quarto" : "Novo tipo de quarto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere as informações do tipo de quarto."
              : "Preencha os dados para cadastrar um novo tipo de quarto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <RoomTypeFields errors={form.formState.errors} register={form.register} />
          <ServerErrorMessage message={serverError} />
          <SubmitFooter isEdit={isEdit} isSubmitting={isSubmitting} createLabel="Criar tipo" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoomTypeFields({
  errors,
  register,
}: {
  errors: FieldErrors<RoomTypeFormValues>;
  register: UseFormRegister<RoomTypeFormValues>;
}) {
  return (
    <>
      <TextField
        label="Nome"
        placeholder="Ex: Suíte Master"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="Descrição"
        placeholder="Descrição opcional"
        error={errors.description?.message}
        {...register("description")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Capacidade base"
          type="number"
          placeholder="1"
          error={errors.baseCapacity?.message}
          {...register("baseCapacity")}
        />
        <TextField
          label="Capacidade máxima"
          type="number"
          placeholder="4"
          error={errors.maxCapacity?.message}
          {...register("maxCapacity")}
        />
      </div>
      <TextField
        label="Preço base (R$)"
        type="number"
        placeholder="0,00"
        step="0.01"
        error={errors.basePrice?.message}
        {...register("basePrice")}
      />
    </>
  );
}

function useRoomTypeForm(
  props: Props,
): UseFormReturn<RoomTypeFormValues, unknown, CreateRoomTypeInput> {
  return useForm<RoomTypeFormValues, unknown, CreateRoomTypeInput>({
    resolver: zodResolver(createRoomTypeSchema),
    defaultValues: getRoomTypeDefaultValues(props),
  });
}

function getRoomTypeDefaultValues(props: Props): RoomTypeFormValues {
  if (props.mode === "create") {
    return { name: "", description: "", baseCapacity: 1, maxCapacity: 1, basePrice: 0 };
  }

  return {
    name: props.roomType.name,
    description: props.roomType.description ?? "",
    baseCapacity: props.roomType.baseCapacity,
    maxCapacity: props.roomType.maxCapacity,
    basePrice: Number(props.roomType.basePrice),
  };
}
