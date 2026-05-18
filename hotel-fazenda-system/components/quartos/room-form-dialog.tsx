"use client";

import { useState } from "react";
import {
  Controller,
  useForm,
  type Control,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "@/components/shared/text-field";
import {
  DialogActionTrigger,
  ServerErrorMessage,
  SubmitFooter,
} from "@/components/quartos/room-dialog-parts";
import { createRoom, updateRoom } from "@/lib/actions/room";
import { createRoomSchema, type CreateRoomInput } from "@/lib/validations/room";
import type { RoomTypeForClient } from "@/lib/client-serialization";
import type { Room } from "@prisma/client";
import type { z } from "zod";

type FormValues = z.input<typeof createRoomSchema>;

type Props =
  | { mode: "create"; roomTypes: RoomTypeForClient[]; onDone: () => void }
  | { mode: "edit"; room: Room; roomTypes: RoomTypeForClient[]; onDone: () => void };

export function RoomFormDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = props.mode === "edit";
  const form = useRoomForm(props);

  async function onSubmit(values: CreateRoomInput) {
    setServerError(null);
    setIsSubmitting(true);

    const result = isEdit ? await updateRoom(props.room.id, values) : await createRoom(values);
    setIsSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    form.reset(getRoomDefaultValues(props));
    props.onDone();
  }

  function onOpenChange(next: boolean) {
    if (!next) {
      form.reset(getRoomDefaultValues(props));
      setServerError(null);
      setIsSubmitting(false);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogActionTrigger isEdit={isEdit} createLabel="Novo quarto" />
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar quarto" : "Novo quarto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere as informações do quarto."
              : "Preencha os dados para cadastrar um novo quarto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <RoomFields
            control={form.control}
            errors={form.formState.errors}
            register={form.register}
            roomTypes={props.roomTypes}
          />
          <ServerErrorMessage message={serverError} />
          <SubmitFooter isEdit={isEdit} isSubmitting={isSubmitting} createLabel="Criar quarto" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoomFields({
  control,
  errors,
  register,
  roomTypes,
}: {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  register: UseFormRegister<FormValues>;
  roomTypes: RoomTypeForClient[];
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Nome"
          placeholder="Ex: Quarto 101"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Número"
          placeholder="Ex: 101"
          error={errors.number?.message}
          {...register("number")}
        />
      </div>

      <RoomTypeSelectField
        control={control}
        error={errors.roomTypeId?.message}
        roomTypes={roomTypes}
      />

      <TextField
        label="Observações"
        placeholder="Observações opcionais"
        error={errors.notes?.message}
        {...register("notes")}
      />
    </>
  );
}

function RoomTypeSelectField({
  control,
  error,
  roomTypes,
}: {
  control: Control<FormValues>;
  error?: string;
  roomTypes: RoomTypeForClient[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Tipo de quarto</label>
      <Controller
        control={control}
        name="roomTypeId"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="w-full" aria-invalid={!!error}>
              <SelectValue placeholder="Selecione um tipo...">
                {(value: string | null) => getRoomTypeSelectLabel(roomTypes, value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roomTypes.map((roomType) => (
                <SelectItem key={roomType.id} value={roomType.id}>
                  {roomType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getRoomTypeSelectLabel(roomTypes: RoomTypeForClient[], value: string | null): string {
  if (!value) return "Selecione um tipo...";
  return roomTypes.find((roomType) => roomType.id === value)?.name ?? "Tipo de quarto";
}

function useRoomForm(props: Props): UseFormReturn<FormValues, unknown, CreateRoomInput> {
  return useForm<FormValues, unknown, CreateRoomInput>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: getRoomDefaultValues(props),
  });
}

function getRoomDefaultValues(props: Props): FormValues {
  if (props.mode === "create") {
    return { name: "", number: "", roomTypeId: "", status: "AVAILABLE", notes: "" };
  }

  return {
    name: props.room.name,
    number: props.room.number,
    roomTypeId: props.room.roomTypeId,
    status: props.room.status,
    notes: props.room.notes ?? "",
  };
}
