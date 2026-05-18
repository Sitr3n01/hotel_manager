import { z } from "zod";

const ReservationStatusEnum = z.enum([
  "PRE_RESERVED",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
]);

const reservationBaseFields = {
  guestId: z.string().uuid("Hóspede inválido"),
  roomId: z.string().uuid("Quarto inválido"),
  checkInDate: z.date({ message: "Data de check-in inválida" }),
  checkOutDate: z.date({ message: "Data de check-out inválida" }),
  adults: z.number().int().min(1, "Pelo menos 1 adulto"),
  children: z.number().int().min(0, "Crianças não pode ser negativo").default(0),
  dailyRate: z.number().min(0, "Diária não pode ser negativa"),
  discountAmount: z.number().min(0, "Desconto não pode ser negativo").default(0),
  notes: z.string().max(1000, "Observações muito longas").optional().nullable().or(z.literal("")),
};

export const createReservationSchema = z
  .object(reservationBaseFields)
  .refine(hasFutureCheckOut, {
    message: "Check-out deve ser depois do check-in",
    path: ["checkOutDate"],
  });

export const updateReservationSchema = z
  .object(reservationBaseFields)
  .partial()
  .refine(hasFutureCheckOutWhenBothSet, {
    message: "Check-out deve ser depois do check-in",
    path: ["checkOutDate"],
  });

export const changeReservationStatusSchema = z.object({
  reservationId: z.string().uuid(),
  newStatus: ReservationStatusEnum,
  reason: z.string().max(500).optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ChangeReservationStatusInput = z.infer<typeof changeReservationStatusSchema>;

function hasFutureCheckOut(data: {
  checkInDate: Date;
  checkOutDate: Date;
}): boolean {
  return data.checkOutDate.getTime() > data.checkInDate.getTime();
}

function hasFutureCheckOutWhenBothSet(data: {
  checkInDate?: Date;
  checkOutDate?: Date;
}): boolean {
  if (!data.checkInDate || !data.checkOutDate) return true;
  return data.checkOutDate.getTime() > data.checkInDate.getTime();
}

export { ReservationStatusEnum };
