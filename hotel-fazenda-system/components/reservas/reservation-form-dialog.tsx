"use client";

import { useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReservationFormFields } from "@/components/reservas/reservation-form-fields";
import type { FormValues } from "@/components/reservas/reservation-form-shared";
import { SubmitFooter } from "@/components/shared/submit-footer";
import { createReservation, updateReservation } from "@/lib/actions/reservation";
import {
  createReservationSchema,
  type CreateReservationInput,
} from "@/lib/validations/reservation";
import type {
  ReservationWithRelationsForClient,
  RoomWithTypeForClient,
} from "@/lib/client-serialization";
import type { Guest } from "@prisma/client";

type RoomWithType = RoomWithTypeForClient;

type DialogControlProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

type Props =
  | ({
      mode: "create";
      guests: Guest[];
      rooms: RoomWithType[];
      onDone: () => void;
      initialValues?: Partial<FormValues>;
    } & DialogControlProps)
  | ({
      mode: "edit";
      reservation: ReservationWithRelationsForClient;
      guests: Guest[];
      rooms: RoomWithType[];
      onDone: () => void;
    } & DialogControlProps);

export function ReservationFormDialog(props: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = props.mode === "edit";
  const open = props.open ?? internalOpen;
  const form = useReservationForm(props);

  async function onSubmit(values: CreateReservationInput) {
    setServerError(null);
    setIsSubmitting(true);
    const result = isEdit
      ? await updateReservation(props.reservation.id, values)
      : await createReservation(values);
    setIsSubmitting(false);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setDialogOpen(false);
    form.reset(getReservationDefaults(props));
    props.onDone();
  }

  function onOpenChange(next: boolean) {
    if (!next) {
      form.reset(getReservationDefaults(props));
      setServerError(null);
      setIsSubmitting(false);
    }
    setDialogOpen(next);
  }

  function setDialogOpen(next: boolean) {
    if (props.open === undefined) {
      setInternalOpen(next);
    }
    props.onOpenChange?.(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {props.hideTrigger ? null : <ReservationDialogTrigger isEdit={isEdit} />}
      <DialogContent showCloseButton className="sm:max-w-lg">
        <ReservationDialogHeader isEdit={isEdit} />
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <ReservationFormFields
            control={form.control}
            errors={form.formState.errors}
            register={form.register}
            setValue={form.setValue}
            guests={props.guests}
            rooms={props.rooms}
          />
          {serverError ? <FormError message={serverError} /> : null}
          <SubmitFooter
            isSubmitting={isSubmitting}
            label={isEdit ? "Salvar alterações" : "Criar reserva"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

const reservationResolver = zodResolver(createReservationSchema) as Resolver<
  FormValues,
  unknown,
  CreateReservationInput
>;

function ReservationDialogTrigger({ isEdit }: { isEdit: boolean }) {
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
          Nova reserva
        </>
      )}
    </DialogTrigger>
  );
}

function ReservationDialogHeader({ isEdit }: { isEdit: boolean }) {
  return (
    <DialogHeader>
      <DialogTitle>{isEdit ? "Editar reserva" : "Nova reserva"}</DialogTitle>
      <DialogDescription>
        {isEdit
          ? "Altere os dados da reserva. Mudanças passam por validação de conflito de datas."
          : "Crie uma nova reserva. O quarto não pode estar reservado no período escolhido."}
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

function useReservationForm(
  props: Props,
): UseFormReturn<FormValues, unknown, CreateReservationInput> {
  return useForm<FormValues, unknown, CreateReservationInput>({
    resolver: reservationResolver,
    defaultValues: getReservationDefaults(props),
  });
}

function getReservationDefaults(props: Props): FormValues {
  if (props.mode === "create") {
    const defaults = {
      guestId: "",
      roomId: "",
      checkInDate: undefined,
      checkOutDate: undefined,
      adults: 1,
      children: 0,
      dailyRate: 0,
      discountAmount: 0,
      notes: "",
    };
    return { ...defaults, ...props.initialValues };
  }

  const r = props.reservation;
  return {
    guestId: r.guestId,
    roomId: r.roomId,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    adults: r.adults,
    children: r.children,
    dailyRate: Number(r.dailyRate),
    discountAmount: Number(r.discountAmount),
    notes: r.notes ?? "",
  };
}
