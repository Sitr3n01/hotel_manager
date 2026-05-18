"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { canViewGuests, hasPermission } from "@/lib/permissions";
import {
  createGuestSchema,
  updateGuestSchema,
  type CreateGuestInput,
  type UpdateGuestInput,
} from "@/lib/validations/guest";
import { Prisma, type Guest } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

type ListGuestsParams = {
  search?: string;
};

export async function listGuests(params?: ListGuestsParams) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewGuests(user)) return [];

  return prisma.guest.findMany({
    where: buildGuestWhere(params),
    orderBy: { name: "asc" },
    include: { _count: { select: { reservations: true } } },
  });
}

export async function createGuest(input: CreateGuestInput): Promise<ActionResult<Guest>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "GUESTS_CREATE"))
    return { success: false, error: "Sem permissão para gerenciar hóspedes" };

  const parsed = createGuestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const guest = await prisma.guest.create({ data: normalizeGuestInput(parsed.data) });
    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Guest",
      entityId: guest.id,
      afterData: guest,
    });

    revalidatePath("/hospedes");
    return { success: true, data: guest };
  } catch (error) {
    return toGuestActionError(error);
  }
}

export async function updateGuest(
  id: string,
  input: UpdateGuestInput,
): Promise<ActionResult<Guest>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "GUESTS_UPDATE"))
    return { success: false, error: "Sem permissão para gerenciar hóspedes" };

  const parsed = updateGuestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.guest.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Hóspede não encontrado" };

  try {
    const guest = await prisma.guest.update({
      where: { id },
      data: normalizeGuestInput(parsed.data),
    });
    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Guest",
      entityId: id,
      beforeData: before,
      afterData: guest,
    });

    revalidatePath("/hospedes");
    return { success: true, data: guest };
  } catch (error) {
    return toGuestActionError(error);
  }
}

export async function deleteGuest(id: string): Promise<ActionResult<Guest>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "GUESTS_DEACTIVATE"))
    return { success: false, error: "Sem permissão para gerenciar hóspedes" };

  const before = await prisma.guest.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Hóspede não encontrado" };

  try {
    const guest = await prisma.guest.update({ where: { id }, data: { isActive: false } });
    await logAudit({
      actorId: user.id,
      action: "DEACTIVATE",
      entity: "Guest",
      entityId: id,
      beforeData: before,
      afterData: guest,
    });

    revalidatePath("/hospedes");
    return { success: true, data: guest };
  } catch (error) {
    return toGuestActionError(error);
  }
}

function buildGuestWhere(params?: ListGuestsParams): Prisma.GuestWhereInput {
  const where: Prisma.GuestWhereInput = { isActive: true };
  if (!params?.search) return where;
  const query = params.search.trim();
  if (!query) return where;

  where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { document: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
    ];
  return where;
}

function normalizeGuestInput<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value === "" ? null : value;
  }
  return out as T;
}

function toGuestActionError(error: unknown): ActionResult<Guest> {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return {
      success: false,
      error: "Hóspede possui reservas vinculadas e não pode ser excluído.",
    };
  }
  return { success: false, error: "Não foi possível salvar o hóspede. Tente novamente." };
}
