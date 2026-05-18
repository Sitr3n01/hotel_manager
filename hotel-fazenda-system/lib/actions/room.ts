"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { canChangeRoomStatus, canViewRooms, hasPermission } from "@/lib/permissions";
import { canTransitionRoomStatus, getRoomStatusLabel, isRoomStatus } from "@/lib/room-status";
import {
  createRoomSchema,
  updateRoomSchema,
  type CreateRoomInput,
  type UpdateRoomInput,
} from "@/lib/validations/room";
import { Prisma, type ReservationStatus, type Room, type RoomStatus } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

type ListRoomsParams = {
  status?: RoomStatus;
  roomTypeId?: string;
  isActive?: "all" | "active" | "inactive";
  search?: string;
};

export async function listRooms(params?: ListRoomsParams) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewRooms(user)) return [];

  return prisma.room.findMany({
    where: buildRoomWhere(params),
    orderBy: { number: "asc" },
    include: { roomType: true },
  });
}

export async function createRoom(input: CreateRoomInput): Promise<ActionResult<Room>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "ROOMS_CREATE"))
    return { success: false, error: "Sem permissão para gerenciar quartos" };

  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const roomTypeError = await validateActiveRoomType(parsed.data.roomTypeId);
  if (roomTypeError) return roomTypeError;

  try {
    const room = await prisma.room.create({ data: parsed.data });
    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Room",
      entityId: room.id,
      afterData: room,
    });

    revalidatePath("/quartos");
    return { success: true, data: room };
  } catch (error) {
    return toRoomActionError(error);
  }
}

export async function updateRoom(id: string, input: UpdateRoomInput): Promise<ActionResult<Room>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "ROOMS_UPDATE"))
    return { success: false, error: "Sem permissão para gerenciar quartos" };

  const parsed = updateRoomSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.room.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Quarto não encontrado" };
  if (parsed.data.status && parsed.data.status !== before.status && !hasPermission(user, "ROOMS_CHANGE_STATUS")) {
    return { success: false, error: "Sem permissão para alterar status de quartos" };
  }

  const relationError = await validateRoomUpdateData(before, parsed.data);
  if (relationError) return relationError;

  try {
    const room = await prisma.room.update({ where: { id }, data: parsed.data });
    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Room",
      entityId: id,
      beforeData: before,
      afterData: room,
    });

    revalidatePath("/quartos");
    return { success: true, data: room };
  } catch (error) {
    return toRoomActionError(error);
  }
}

export async function deactivateRoom(id: string): Promise<ActionResult<Room>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "ROOMS_DEACTIVATE"))
    return { success: false, error: "Sem permissão para gerenciar quartos" };

  const activeReservationStatuses: ReservationStatus[] = [
    "PRE_RESERVED",
    "CONFIRMED",
    "CHECKED_IN",
  ];
  const activeReservations = await prisma.reservation.count({
    where: { roomId: id, status: { in: activeReservationStatuses } },
  });
  if (activeReservations > 0) {
    return {
      success: false,
      error: `Existe(m) ${activeReservations} reserva(s) ativa(s) neste quarto. Resolva as reservas primeiro.`,
    };
  }

  const before = await prisma.room.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Quarto não encontrado" };

  try {
    const room = await prisma.room.update({ where: { id }, data: { isActive: false } });
    await logAudit({
      actorId: user.id,
      action: "DEACTIVATE",
      entity: "Room",
      entityId: id,
      beforeData: before,
      afterData: room,
    });

    revalidatePath("/quartos");
    return { success: true, data: room };
  } catch (error) {
    return toRoomActionError(error);
  }
}

export async function changeRoomStatus(
  id: string,
  newStatus: RoomStatus | null,
): Promise<ActionResult<Room>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!canChangeRoomStatus(user))
    return { success: false, error: "Sem permissão para alterar status de quartos" };

  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return { success: false, error: "Quarto não encontrado" };
  if (!room.isActive) return { success: false, error: "Não altere status de quarto inativo" };
  if (!isRoomStatus(newStatus)) {
    return { success: false, error: "Selecione um status válido para o quarto" };
  }

  if (!canTransitionRoomStatus(room.status, newStatus)) {
    return {
      success: false,
      error: `Transição de "${getRoomStatusLabel(room.status)}" para "${getRoomStatusLabel(newStatus)}" não é permitida`,
    };
  }

  try {
    const updated = await prisma.room.update({ where: { id }, data: { status: newStatus } });

    await logAudit({
      actorId: user.id,
      action: "STATUS_CHANGE",
      entity: "Room",
      entityId: id,
      beforeData: { status: room.status },
      afterData: { status: newStatus },
      metadata: { previousStatus: room.status, newStatus },
    });

    revalidatePath("/quartos");
    return { success: true, data: updated };
  } catch (error) {
    return toRoomActionError(error);
  }
}

function buildRoomWhere(params?: ListRoomsParams): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = {};
  if (!params) return where;

  if (params.status) where.status = params.status;
  if (params.roomTypeId) where.roomTypeId = params.roomTypeId;
  if (params.isActive && params.isActive !== "all") where.isActive = params.isActive === "active";
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { number: { contains: params.search, mode: "insensitive" } },
    ];
  }

  return where;
}

async function validateRoomUpdateData(
  before: Room,
  data: UpdateRoomInput,
): Promise<ActionResult<Room> | null> {
  const roomTypeError = await validateActiveRoomType(data.roomTypeId);
  if (roomTypeError) return roomTypeError;

  if (!data.status || data.status === before.status) return null;
  if (canTransitionRoomStatus(before.status, data.status)) return null;

  return { success: false, error: "Transição de status não permitida para este quarto" };
}

async function validateActiveRoomType(roomTypeId?: string): Promise<ActionResult<Room> | null> {
  if (!roomTypeId) return null;

  const roomType = await prisma.roomType.findFirst({
    where: { id: roomTypeId, isActive: true },
    select: { id: true },
  });

  return roomType ? null : { success: false, error: "Tipo de quarto ativo não encontrado" };
}

function toRoomActionError(error: unknown): ActionResult<Room> {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { success: false, error: "Já existe um quarto com este número" };
  }
  return { success: false, error: "Não foi possível salvar o quarto. Tente novamente." };
}
