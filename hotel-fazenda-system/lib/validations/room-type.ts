import { z } from "zod";

const capacityError = "Capacidade máxima deve ser maior ou igual à capacidade base";

const roomTypeFields = {
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
  baseCapacity: z.coerce
    .number()
    .int("Deve ser um número inteiro")
    .positive("Capacidade base deve ser maior que 0"),
  maxCapacity: z.coerce.number().int("Deve ser um número inteiro"),
  basePrice: z.coerce.number().min(0, "Preço base não pode ser negativo"),
};

export const createRoomTypeSchema = z.object(roomTypeFields).refine(isCapacityRangeValid, {
  message: capacityError,
  path: ["maxCapacity"],
});

export const updateRoomTypeSchema = z
  .object(roomTypeFields)
  .partial()
  .refine(isPartialCapacityRangeValid, {
    message: capacityError,
    path: ["maxCapacity"],
  });

function isCapacityRangeValid(data: { baseCapacity: number; maxCapacity: number }): boolean {
  return data.maxCapacity >= data.baseCapacity;
}

function isPartialCapacityRangeValid(data: {
  baseCapacity?: number;
  maxCapacity?: number;
}): boolean {
  if (data.baseCapacity === undefined || data.maxCapacity === undefined) return true;
  return isCapacityRangeValid({ baseCapacity: data.baseCapacity, maxCapacity: data.maxCapacity });
}

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
