"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { canViewRoomTypes, hasPermission } from "@/lib/permissions";
import {
  createRoomTypeSchema,
  updateRoomTypeSchema,
  type CreateRoomTypeInput,
  type UpdateRoomTypeInput,
} from "@/lib/validations/room-type";
import { Prisma, type RoomType } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function listRoomTypes(): Promise<(RoomType & { _count: { rooms: number } })[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewRoomTypes(user)) return [];

  return prisma.roomType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { rooms: true } } },
  });
}

export async function createRoomType(input: CreateRoomTypeInput): Promise<ActionResult<RoomType>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "ROOM_TYPES_MANAGE"))
    return { success: false, error: "Sem permissão para gerenciar tipos de quarto" };

  const parsed = createRoomTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const roomType = await prisma.roomType.create({ data: parsed.data });
    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "RoomType",
      entityId: roomType.id,
      afterData: roomType,
    });

    revalidatePath("/quartos");
    return { success: true, data: roomType };
  } catch (error) {
    return toRoomTypeActionError(error);
  }
}

export async function updateRoomType(
  id: string,
  input: UpdateRoomTypeInput,
): Promise<ActionResult<RoomType>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "ROOM_TYPES_MANAGE"))
    return { success: false, error: "Sem permissão para gerenciar tipos de quarto" };

  const parsed = updateRoomTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.roomType.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Tipo de quarto não encontrado" };

  const mergedCapacity = {
    baseCapacity: parsed.data.baseCapacity ?? before.baseCapacity,
    maxCapacity: parsed.data.maxCapacity ?? before.maxCapacity,
  };
  if (mergedCapacity.maxCapacity < mergedCapacity.baseCapacity) {
    return {
      success: false,
      error: "Capacidade máxima deve ser maior ou igual à capacidade base",
      fieldErrors: { maxCapacity: ["Capacidade máxima deve ser maior ou igual à capacidade base"] },
    };
  }

  try {
    const roomType = await prisma.roomType.update({ where: { id }, data: parsed.data });
    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "RoomType",
      entityId: id,
      beforeData: before,
      afterData: roomType,
    });

    revalidatePath("/quartos");
    return { success: true, data: roomType };
  } catch (error) {
    return toRoomTypeActionError(error);
  }
}

export async function deactivateRoomType(id: string): Promise<ActionResult<RoomType>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "ROOM_TYPES_MANAGE"))
    return { success: false, error: "Sem permissão para gerenciar tipos de quarto" };

  const activeRooms = await prisma.room.count({ where: { roomTypeId: id, isActive: true } });
  if (activeRooms > 0) {
    return {
      success: false,
      error: `Existe(m) ${activeRooms} quarto(s) ativo(s) vinculado(s) a este tipo. Desative os quartos primeiro.`,
    };
  }

  const before = await prisma.roomType.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Tipo de quarto não encontrado" };

  try {
    const roomType = await prisma.roomType.update({ where: { id }, data: { isActive: false } });
    await logAudit({
      actorId: user.id,
      action: "DEACTIVATE",
      entity: "RoomType",
      entityId: id,
      beforeData: before,
      afterData: roomType,
    });

    revalidatePath("/quartos");
    return { success: true, data: roomType };
  } catch (error) {
    return toRoomTypeActionError(error);
  }
}

function toRoomTypeActionError(error: unknown): ActionResult<RoomType> {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { success: false, error: "Já existe um tipo de quarto com este nome" };
  }
  return { success: false, error: "Não foi possível salvar o tipo de quarto. Tente novamente." };
}
