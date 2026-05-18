import type { z } from "zod";
import type { createReservationSchema } from "@/lib/validations/reservation";

type SchemaInput = z.input<typeof createReservationSchema>;

export type FormValues = Omit<SchemaInput, "checkInDate" | "checkOutDate"> & {
  checkInDate?: Date;
  checkOutDate?: Date;
};
