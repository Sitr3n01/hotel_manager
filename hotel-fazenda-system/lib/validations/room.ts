import { z } from "zod";

const RoomStatusEnum = z.enum(["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE", "CLEANING", "BLOCKED"]);

export const createRoomSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
  number: z.string().min(1, "Número é obrigatório").max(20, "Número muito longo"),
  roomTypeId: z.string().uuid("Tipo de quarto inválido"),
  status: RoomStatusEnum.default("AVAILABLE"),
  notes: z.string().max(1000, "Observações muito longas").optional().nullable(),
});

export const updateRoomSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").max(200, "Nome muito longo"),
    number: z.string().min(1, "Número é obrigatório").max(20, "Número muito longo"),
    roomTypeId: z.string().uuid("Tipo de quarto inválido"),
    status: RoomStatusEnum,
    notes: z.string().max(1000, "Observações muito longas").optional().nullable(),
  })
  .partial();

export const changeRoomStatusSchema = z.object({
  roomId: z.string().uuid(),
  newStatus: RoomStatusEnum,
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ChangeRoomStatusInput = z.infer<typeof changeRoomStatusSchema>;
export { RoomStatusEnum };
