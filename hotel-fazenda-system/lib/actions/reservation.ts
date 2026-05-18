"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  canCancelReservation,
  canCheckInOut,
  canViewReservations,
  hasPermission,
} from "@/lib/permissions";
import { findOverlappingReservation } from "@/lib/availability";
import { canTransitionReservationStatus, isReservationTerminal } from "@/lib/reservation-status";
import {
  createReservationSchema,
  updateReservationSchema,
  type CreateReservationInput,
  type UpdateReservationInput,
} from "@/lib/validations/reservation";
import { toDateOnly } from "@/lib/date-format";
import {
  Prisma,
  type Reservation,
  type ReservationStatus,
  type RoomStatus,
} from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type ListReservationsParams = {
  status?: ReservationStatus;
  from?: Date;
  to?: Date;
  roomId?: string;
  search?: string;
};

export async function listReservations(params?: ListReservationsParams) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewReservations(user)) return [];

  return prisma.reservation.findMany({
    where: buildReservationWhere(params),
    orderBy: { checkInDate: "desc" },
    include: { guest: true, room: { include: { roomType: true } } },
  });
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<ActionResult<Reservation>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "RESERVATIONS_CREATE"))
    return { success: false, error: "Sem permissão para criar reservas" };

  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const validation = await validateReservationData(parsed.data);
  if (validation) return validation;

  try {
    const reservation = await prisma.reservation.create({
      data: {
        ...parsed.data,
        notes: parsed.data.notes || null,
        createdById: user.id,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Reservation",
      entityId: reservation.id,
      afterData: reservation,
    });

    revalidatePath("/reservas");
    return { success: true, data: reservation };
  } catch (error) {
    return toReservationActionError(error);
  }
}

export async function updateReservation(
  id: string,
  input: UpdateReservationInput,
): Promise<ActionResult<Reservation>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "RESERVATIONS_UPDATE"))
    return { success: false, error: "Sem permissão para editar reservas" };

  const parsed = updateReservationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.reservation.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Reserva não encontrada" };
  const editPermissionError = validateReservationEditAccess(user, before, parsed.data);
  if (editPermissionError) return editPermissionError;

  const validation = await validateReservationUpdate(before, parsed.data);
  if (validation) return validation;

  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...parsed.data,
        notes: parsed.data.notes === "" ? null : parsed.data.notes,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Reservation",
      entityId: id,
      beforeData: before,
      afterData: reservation,
    });

    revalidatePath("/reservas");
    return { success: true, data: reservation };
  } catch (error) {
    return toReservationActionError(error);
  }
}

export async function confirmReservation(id: string): Promise<ActionResult<Reservation>> {
  return runStatusTransition(id, "CONFIRMED", "CONFIRM", async (before, tx) => {
    await assertRoomStatus(tx, before.roomId, ["AVAILABLE"], "Quarto precisa estar disponível para confirmar a reserva");
    await tx.room.update({ where: { id: before.roomId }, data: { status: "RESERVED" } });
  });
}

export async function checkInReservation(id: string): Promise<ActionResult<Reservation>> {
  return runStatusTransition(id, "CHECKED_IN", "CHECK_IN", async (before, tx) => {
    await assertRoomStatus(tx, before.roomId, ["AVAILABLE", "RESERVED"], "Quarto indisponível para check-in");
    await tx.room.update({ where: { id: before.roomId }, data: { status: "OCCUPIED" } });
  }, { requiredPermission: "checkInOut" });
}

export async function checkOutReservation(id: string): Promise<ActionResult<Reservation>> {
  return runStatusTransition(id, "CHECKED_OUT", "CHECK_OUT", async (before, tx) => {
    await tx.room.update({ where: { id: before.roomId }, data: { status: "CLEANING" } });
  }, { requiredPermission: "checkInOut" });
}

export async function cancelReservation(
  id: string,
  reason?: string,
): Promise<ActionResult<Reservation>> {
  return runStatusTransition(
    id,
    "CANCELLED",
    "CANCEL",
    async (before, tx) => {
      await maybeSetRoomStatus(tx, before.roomId, "RESERVED", "AVAILABLE");
      await maybeSetRoomStatus(tx, before.roomId, "OCCUPIED", "AVAILABLE");
    },
    { requiredPermission: "cancel", metadata: reason ? { reason } : undefined },
  );
}

export async function markNoShow(id: string): Promise<ActionResult<Reservation>> {
  return runStatusTransition(id, "NO_SHOW", "NO_SHOW", async (before, tx) => {
    await maybeSetRoomStatus(tx, before.roomId, "RESERVED", "AVAILABLE");
  });
}

type TransitionContext = {
  requiredPermission?: "manage" | "checkInOut" | "cancel";
  metadata?: Record<string, unknown>;
};

async function runStatusTransition(
  id: string,
  newStatus: ReservationStatus,
  auditAction: "CONFIRM" | "CHECK_IN" | "CHECK_OUT" | "CANCEL" | "NO_SHOW",
  sideEffect: (
    before: Reservation,
    tx: Prisma.TransactionClient,
  ) => Promise<void>,
  context: TransitionContext = {},
): Promise<ActionResult<Reservation>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const allowed = checkTransitionPermission(user, context.requiredPermission, newStatus);
  if (!allowed) return { success: false, error: "Sem permissão para esta ação" };

  const before = await prisma.reservation.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Reserva não encontrada" };

  if (!canTransitionReservationStatus(before.status, newStatus)) {
    return {
      success: false,
      error: `Transição de "${before.status}" para "${newStatus}" não é permitida`,
    };
  }

  if (newStatus === "NO_SHOW" && toDateOnly(new Date()) < toDateOnly(before.checkInDate)) {
    return { success: false, error: "No-show só pode ser registrado a partir da data de check-in" };
  }

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: newStatus },
      });
      await sideEffect(before, tx);
      return updated;
    });

    await logAudit({
      actorId: user.id,
      action: auditAction,
      entity: "Reservation",
      entityId: id,
      beforeData: { status: before.status },
      afterData: { status: newStatus },
      metadata: { previousStatus: before.status, newStatus, ...context.metadata },
    });

    revalidatePath("/reservas");
    revalidatePath("/quartos");
    return { success: true, data: reservation };
  } catch (error) {
    return toReservationActionError(error);
  }
}

function checkTransitionPermission(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  required: TransitionContext["requiredPermission"] | undefined,
  newStatus: ReservationStatus,
): boolean {
  if (required === "cancel") return canCancelReservation(user);
  if (required === "checkInOut") {
    if (newStatus === "CHECKED_IN") return hasPermission(user, "RESERVATIONS_CHECKIN");
    if (newStatus === "CHECKED_OUT") return hasPermission(user, "RESERVATIONS_CHECKOUT");
    return canCheckInOut(user);
  }
  return hasPermission(user, "RESERVATIONS_UPDATE");
}

function changesDailyRate(before: Reservation, data: UpdateReservationInput): boolean {
  if (data.dailyRate === undefined) return false;
  return !new Prisma.Decimal(data.dailyRate).equals(before.dailyRate);
}

function changesDiscount(before: Reservation, data: UpdateReservationInput): boolean {
  if (data.discountAmount === undefined) return false;
  return !new Prisma.Decimal(data.discountAmount).equals(before.discountAmount);
}

function validateReservationEditAccess(
  user: CurrentUser,
  before: Reservation,
  data: UpdateReservationInput,
): ActionResult<Reservation> | null {
  if (isReservationTerminal(before.status)) {
    return { success: false, error: "Reserva finalizada não pode ser editada" };
  }
  if (changesDailyRate(before, data) && !hasPermission(user, "RESERVATIONS_CHANGE_DAILY_RATE")) {
    return { success: false, error: "Sem permissão para alterar diária" };
  }
  if (changesDiscount(before, data) && !hasPermission(user, "RESERVATIONS_APPLY_DISCOUNT")) {
    return { success: false, error: "Sem permissão para aplicar desconto" };
  }
  return null;
}

async function maybeSetRoomStatus(
  tx: Prisma.TransactionClient,
  roomId: string,
  currentStatus: RoomStatus,
  newStatus: RoomStatus,
): Promise<void> {
  const room = await tx.room.findUnique({ where: { id: roomId } });
  if (room?.status === currentStatus) {
    await tx.room.update({ where: { id: roomId }, data: { status: newStatus } });
  }
}

async function assertRoomStatus(
  tx: Prisma.TransactionClient,
  roomId: string,
  allowedStatuses: RoomStatus[],
  message: string,
): Promise<void> {
  const room = await tx.room.findUnique({ where: { id: roomId } });
  if (!room || !allowedStatuses.includes(room.status)) {
    throw new Error(message);
  }
}

function buildReservationWhere(
  params?: ListReservationsParams,
): Prisma.ReservationWhereInput {
  const where: Prisma.ReservationWhereInput = {};
  if (!params) return where;
  if (params.status) where.status = params.status;
  if (params.roomId) where.roomId = params.roomId;
  if (params.from) where.checkOutDate = { gte: params.from };
  if (params.to) where.checkInDate = { lte: params.to };
  if (params.search) {
    where.OR = [
      { guest: { name: { contains: params.search, mode: "insensitive" } } },
      { guest: { document: { contains: params.search, mode: "insensitive" } } },
      { room: { number: { contains: params.search, mode: "insensitive" } } },
      { room: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }
  return where;
}

async function validateReservationData(
  data: CreateReservationInput,
): Promise<ActionResult<Reservation> | null> {
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: { roomType: true },
  });
  if (!room || !room.isActive) {
    return { success: false, error: "Quarto inativo ou inexistente" };
  }

  if (data.adults + data.children > room.roomType.maxCapacity) {
    return {
      success: false,
      error: `Capacidade excedida (${room.roomType.maxCapacity} pessoas no máximo para este tipo)`,
    };
  }

  const overlap = await findOverlappingReservation({
    roomId: data.roomId,
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
  });
  if (overlap) {
    return { success: false, error: "Quarto já reservado para este período" };
  }

  return null;
}

async function validateReservationUpdate(
  before: Reservation,
  data: UpdateReservationInput,
): Promise<ActionResult<Reservation> | null> {
  const roomId = data.roomId ?? before.roomId;
  const checkInDate = data.checkInDate ?? before.checkInDate;
  const checkOutDate = data.checkOutDate ?? before.checkOutDate;
  const adults = data.adults ?? before.adults;
  const children = data.children ?? before.children;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { roomType: true },
  });
  if (!room || !room.isActive) {
    return { success: false, error: "Quarto inativo ou inexistente" };
  }

  if (adults + children > room.roomType.maxCapacity) {
    return {
      success: false,
      error: `Capacidade excedida (${room.roomType.maxCapacity} pessoas no máximo para este tipo)`,
    };
  }

  const overlap = await findOverlappingReservation({
    roomId,
    checkInDate,
    checkOutDate,
    excludeReservationId: before.id,
  });
  if (overlap) {
    return { success: false, error: "Quarto já reservado para este período" };
  }

  return null;
}

function toReservationActionError(error: unknown): ActionResult<Reservation> {
  if (error instanceof Error && error.message.includes("Quarto")) {
    return { success: false, error: error.message };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return { success: false, error: "Quarto ou hóspede inválido" };
    }
    if (error.message.includes("reservation_no_overlap_per_room")) {
      return { success: false, error: "Quarto já reservado para este período" };
    }
  }
  return { success: false, error: "Não foi possível salvar a reserva. Tente novamente." };
}
