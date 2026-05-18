"use client";

import { useEffect } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/shared/text-field";
import { DatePicker } from "@/components/shared/date-picker";
import { calculateNights, calculateReservationTotal } from "@/lib/pricing";
import { formatDate } from "@/lib/date-format";
import type { RoomWithTypeForClient } from "@/lib/client-serialization";
import type { Guest } from "@prisma/client";
import type { FormValues } from "@/components/reservas/reservation-form-shared";

type RoomWithType = RoomWithTypeForClient;

type Props = {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  guests: Guest[];
  rooms: RoomWithType[];
};

export function ReservationFormFields(props: Props) {
  const { roomId, checkInDate, checkOutDate, dailyRate, discountAmount } = useWatchFields(
    props.control,
  );
  usePriceAutofill(roomId, dailyRate, props.rooms, props.setValue);

  return (
    <div className="space-y-4">
      <GuestSelect control={props.control} errors={props.errors} guests={props.guests} />
      <RoomSelect control={props.control} errors={props.errors} rooms={props.rooms} />

      <div className="grid grid-cols-2 gap-3">
        <DateField
          control={props.control}
          errors={props.errors}
          name="checkInDate"
          label="Check-in"
        />
        <DateField
          control={props.control}
          errors={props.errors}
          name="checkOutDate"
          label="Check-out"
          fromDate={checkInDate ?? undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Adultos"
          type="number"
          min={1}
          error={props.errors.adults?.message}
          {...props.register("adults", { valueAsNumber: true })}
        />
        <TextField
          label="Crianças"
          type="number"
          min={0}
          error={props.errors.children?.message}
          {...props.register("children", { valueAsNumber: true })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Diária (R$)"
          type="number"
          step="0.01"
          min={0}
          error={props.errors.dailyRate?.message}
          {...props.register("dailyRate", { valueAsNumber: true })}
        />
        <TextField
          label="Desconto (R$)"
          type="number"
          step="0.01"
          min={0}
          error={props.errors.discountAmount?.message}
          {...props.register("discountAmount", { valueAsNumber: true })}
        />
      </div>

      <PriceSummary
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        dailyRate={dailyRate}
        discountAmount={discountAmount}
      />

      <NotesField errors={props.errors} register={props.register} />
    </div>
  );
}

function useWatchFields(control: Control<FormValues>) {
  const roomId = useWatch({ control, name: "roomId" });
  const checkInDate = useWatch({ control, name: "checkInDate" });
  const checkOutDate = useWatch({ control, name: "checkOutDate" });
  const dailyRate = useWatch({ control, name: "dailyRate" });
  const discountAmount = useWatch({ control, name: "discountAmount" });
  return { roomId, checkInDate, checkOutDate, dailyRate, discountAmount };
}

function usePriceAutofill(
  roomId: string | undefined,
  dailyRate: number | undefined,
  rooms: RoomWithType[],
  setValue: UseFormSetValue<FormValues>,
) {
  useEffect(() => {
    const selectedRoom = rooms.find((room) => room.id === roomId);
    if (selectedRoom && (dailyRate === undefined || dailyRate === 0)) {
      setValue("dailyRate", Number(selectedRoom.roomType.basePrice));
    }
  }, [roomId, rooms, dailyRate, setValue]);
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
        rows={2}
        placeholder="Observações opcionais sobre a reserva"
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

function GuestSelect({
  control,
  errors,
  guests,
}: {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  guests: Guest[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Hóspede</label>
      <Controller
        control={control}
        name="guestId"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="w-full" aria-invalid={!!errors.guestId?.message}>
              <SelectValue placeholder="Selecione um hóspede...">
                {(value: string | null) => getGuestSelectLabel(guests, value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {guests.map((guest) => (
                <SelectItem key={guest.id} value={guest.id}>
                  {formatGuestOption(guest)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {errors.guestId?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {errors.guestId.message}
        </p>
      ) : null}
    </div>
  );
}

function RoomSelect({
  control,
  errors,
  rooms,
}: {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  rooms: RoomWithType[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Quarto</label>
      <Controller
        control={control}
        name="roomId"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="w-full" aria-invalid={!!errors.roomId?.message}>
              <SelectValue placeholder="Selecione um quarto...">
                {(value: string | null) => getRoomSelectLabel(rooms, value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {formatRoomOption(room)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {errors.roomId?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {errors.roomId.message}
        </p>
      ) : null}
    </div>
  );
}

function DateField({
  control,
  errors,
  name,
  label,
  fromDate,
}: {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  name: "checkInDate" | "checkOutDate";
  label: string;
  fromDate?: Date;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <DatePicker
            value={field.value as Date | null | undefined}
            onChange={field.onChange}
            fromDate={fromDate}
            ariaInvalid={!!fieldState.error}
          />
        )}
      />
      {errors[name]?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {errors[name]?.message as string}
        </p>
      ) : null}
    </div>
  );
}

function getGuestSelectLabel(guests: Guest[], value: string | null): string {
  if (!value) return "Selecione um hóspede...";
  const guest = guests.find((item) => item.id === value);
  return guest ? formatGuestOption(guest) : "Hóspede";
}

function getRoomSelectLabel(rooms: RoomWithType[], value: string | null): string {
  if (!value) return "Selecione um quarto...";
  const room = rooms.find((item) => item.id === value);
  return room ? formatRoomOption(room) : "Quarto";
}

function formatGuestOption(guest: Guest): string {
  return `${guest.name}${guest.document ? ` · ${guest.document}` : ""}`;
}

function formatRoomOption(room: RoomWithType): string {
  return `${room.number} · ${room.name} (${room.roomType.name})`;
}

function PriceSummary({
  checkInDate,
  checkOutDate,
  dailyRate,
  discountAmount,
}: {
  checkInDate: Date | undefined;
  checkOutDate: Date | undefined;
  dailyRate: number | undefined;
  discountAmount: number | undefined;
}) {
  if (!checkInDate || !checkOutDate || !dailyRate) {
    return (
      <p className="text-muted-foreground text-xs">
        Selecione datas e diária para ver o total estimado.
      </p>
    );
  }

  const nights = calculateNights(checkInDate, checkOutDate);
  if (nights <= 0) {
    return (
      <p className="text-warning text-xs">
        Check-out deve ser depois do check-in para calcular o total.
      </p>
    );
  }

  const total = calculateReservationTotal({
    nights,
    dailyRate,
    discountAmount: discountAmount ?? 0,
  });

  return (
    <div className="bg-muted/40 rounded-md px-3 py-2 text-sm">
      <p>
        <strong>{nights}</strong> noite(s) · {formatDate(checkInDate)} a {formatDate(checkOutDate)}
      </p>
      <p className="text-muted-foreground text-xs">
        Total estimado: <strong className="text-foreground">R$ {total.toString()}</strong>
      </p>
    </div>
  );
}
