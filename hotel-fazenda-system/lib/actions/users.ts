"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/get-current-user";
import {
  PERMISSION_PRESETS,
  hasPermission,
  normalizePermissionKeys,
  type PermissionKey,
} from "@/lib/auth/permissions";
import {
  rejectUserSchema,
  updateUserPermissionsSchema,
  type RejectUserInput,
  type UpdateUserPermissionsInput,
} from "@/lib/validations/auth";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const SELF_ADMIN_LOCK_PERMISSIONS: PermissionKey[] = [
  "ACCESS_USERS_ADMIN",
  "USERS_READ",
  "USERS_UPDATE_TAGS",
];

export async function approveUserWithPreset(
  userId: string,
  role: Exclude<Role, "UNASSIGNED">,
): Promise<ActionResult<{ id: string }>> {
  const actor = await getCurrentUser();
  const permissionError = requireActionPermission(actor, "USERS_APPROVE");
  if (permissionError) return permissionError;

  const permissions = PERMISSION_PRESETS[role];
  return approveUser(userId, role, [...permissions]);
}

export async function approveUser(
  userId: string,
  role: Role,
  permissions: readonly string[],
): Promise<ActionResult<{ id: string }>> {
  const actor = await getCurrentUser();
  const permissionError =
    requireActionPermission(actor, "USERS_APPROVE") ??
    requireActionPermission(actor, "USERS_UPDATE_ROLE") ??
    requireActionPermission(actor, "USERS_UPDATE_TAGS");
  if (permissionError) return permissionError;
  if (!actor) return { success: false, error: "Não autenticado" };

  const permissionKeys = normalizePermissionKeys(permissions);
  if (role === "UNASSIGNED") {
    return { success: false, error: "Selecione um perfil base antes de aprovar." };
  }
  if (permissionKeys.length === 0) {
    return { success: false, error: "Conceda pelo menos uma permissão antes de aprovar." };
  }

  const before = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!before) return { success: false, error: "Usuário não encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { id: userId },
      data: {
        role,
        status: "APPROVED",
        isActive: true,
        approvedAt: new Date(),
        approvedById: actor.id,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
    });
    await setUserPermissions(tx, userId, permissionKeys, actor.id);
  });

  await logAudit({
    actorId: actor.id,
    action: "APPROVE",
    entity: "UserProfile",
    entityId: userId,
    beforeData: before,
    afterData: { role, status: "APPROVED", isActive: true, permissions: permissionKeys },
  });

  revalidateAdminPaths();
  return { success: true, data: { id: userId } };
}

export async function rejectUser(
  userId: string,
  input: RejectUserInput,
): Promise<ActionResult<{ id: string }>> {
  const actor = await getCurrentUser();
  const permissionError = requireActionPermission(actor, "USERS_REJECT");
  if (permissionError) return permissionError;
  if (!actor) return { success: false, error: "Não autenticado" };

  const parsed = rejectUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Informe o motivo da rejeição.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (actor.id === userId) {
    return { success: false, error: "Você não pode rejeitar a própria conta." };
  }

  const before = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!before) return { success: false, error: "Usuário não encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { id: userId },
      data: {
        status: "REJECTED",
        isActive: false,
        rejectedAt: new Date(),
        rejectedById: actor.id,
        rejectionReason: parsed.data.reason,
      },
    });
    await revokeAllPermissions(tx, userId, actor.id);
  });

  await logAudit({
    actorId: actor.id,
    action: "REJECT",
    entity: "UserProfile",
    entityId: userId,
    beforeData: before,
    afterData: { status: "REJECTED", reason: parsed.data.reason },
  });

  revalidateAdminPaths();
  return { success: true, data: { id: userId } };
}

export async function blockUser(userId: string): Promise<ActionResult<{ id: string }>> {
  const actor = await getCurrentUser();
  const permissionError = requireActionPermission(actor, "USERS_DEACTIVATE");
  if (permissionError) return permissionError;
  if (!actor) return { success: false, error: "Não autenticado" };
  if (actor.id === userId) return { success: false, error: "Você não pode bloquear a própria conta." };

  const before = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!before) return { success: false, error: "Usuário não encontrado." };

  const user = await prisma.userProfile.update({
    where: { id: userId },
    data: { status: "BLOCKED", isActive: false },
  });

  await logAudit({
    actorId: actor.id,
    action: "BLOCK",
    entity: "UserProfile",
    entityId: userId,
    beforeData: before,
    afterData: { status: user.status, isActive: user.isActive },
  });

  revalidateAdminPaths();
  return { success: true, data: { id: userId } };
}

export async function reactivateUser(userId: string): Promise<ActionResult<{ id: string }>> {
  const actor = await getCurrentUser();
  const permissionError = requireActionPermission(actor, "USERS_REACTIVATE");
  if (permissionError) return permissionError;
  if (!actor) return { success: false, error: "Não autenticado" };

  const before = await prisma.userProfile.findUnique({
    where: { id: userId },
    include: { permissionTags: { where: { isActive: true } } },
  });
  if (!before) return { success: false, error: "Usuário não encontrado." };
  if (before.role === "UNASSIGNED") {
    return { success: false, error: "Defina um perfil e permissões antes de reativar." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { id: userId },
      data: { status: "APPROVED", isActive: true },
    });
    if (before.permissionTags.length === 0) {
      await setUserPermissions(tx, userId, PERMISSION_PRESETS[before.role], actor.id);
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "REACTIVATE",
    entity: "UserProfile",
    entityId: userId,
    beforeData: { status: before.status, isActive: before.isActive },
    afterData: { status: "APPROVED", isActive: true },
  });

  revalidateAdminPaths();
  return { success: true, data: { id: userId } };
}

export async function updateUserPermissions(
  input: UpdateUserPermissionsInput,
): Promise<ActionResult<{ id: string }>> {
  const actor = await getCurrentUser();
  const permissionError =
    requireActionPermission(actor, "USERS_UPDATE_ROLE") ??
    requireActionPermission(actor, "USERS_UPDATE_TAGS");
  if (permissionError) return permissionError;
  if (!actor) return { success: false, error: "Não autenticado" };

  const parsed = updateUserPermissionsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Revise as permissões selecionadas.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const permissionKeys = normalizePermissionKeys(parsed.data.permissions);
  const selfLockError = validateSelfAdminLock(actor, parsed.data.userId, permissionKeys);
  if (selfLockError) return selfLockError;

  const before = await prisma.userProfile.findUnique({
    where: { id: parsed.data.userId },
    include: { permissionTags: { where: { isActive: true }, include: { permissionTag: true } } },
  });
  if (!before) return { success: false, error: "Usuário não encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
    });
    await setUserPermissions(tx, parsed.data.userId, permissionKeys, actor.id);
  });

  await logAudit({
    actorId: actor.id,
    action: "ROLE_CHANGE",
    entity: "UserProfile",
    entityId: parsed.data.userId,
    beforeData: { role: before.role },
    afterData: { role: parsed.data.role },
  });
  await logAudit({
    actorId: actor.id,
    action: "PERMISSION_GRANT",
    entity: "UserPermissionTag",
    entityId: parsed.data.userId,
    beforeData: before.permissionTags.map((entry) => entry.permissionTag.key),
    afterData: permissionKeys,
  });

  revalidateAdminPaths();
  return { success: true, data: { id: parsed.data.userId } };
}

export async function applyUserPreset(
  userId: string,
  role: Role,
): Promise<ActionResult<{ id: string; permissions: PermissionKey[] }>> {
  const actor = await getCurrentUser();
  const permissionError =
    requireActionPermission(actor, "USERS_UPDATE_ROLE") ??
    requireActionPermission(actor, "USERS_UPDATE_TAGS");
  if (permissionError) return permissionError;
  if (!actor) return { success: false, error: "Não autenticado" };

  const permissions = [...PERMISSION_PRESETS[role]];
  const selfLockError = validateSelfAdminLock(actor, userId, permissions);
  if (selfLockError) return selfLockError;

  const before = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!before) return { success: false, error: "Usuário não encontrado." };

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({ where: { id: userId }, data: { role } });
    await setUserPermissions(tx, userId, permissions, actor.id);
  });

  await logAudit({
    actorId: actor.id,
    action: "PRESET_APPLY",
    entity: "UserProfile",
    entityId: userId,
    beforeData: { role: before.role },
    afterData: { role, permissions },
  });

  revalidateAdminPaths();
  return { success: true, data: { id: userId, permissions } };
}

function requireActionPermission(
  actor: CurrentUser | null,
  permission: PermissionKey,
): ActionResult<never> | null {
  if (!actor) return { success: false, error: "Não autenticado" };
  if (!hasPermission(actor, permission)) {
    return { success: false, error: "Sem permissão para executar esta ação." };
  }
  return null;
}

function validateSelfAdminLock(
  actor: CurrentUser,
  targetUserId: string,
  permissions: readonly PermissionKey[],
): ActionResult<never> | null {
  if (actor.id !== targetUserId) return null;
  const next = new Set(permissions);
  const missing = SELF_ADMIN_LOCK_PERMISSIONS.find((permission) => !next.has(permission));
  if (!missing) return null;
  return {
    success: false,
    error: "Você não pode remover suas próprias permissões administrativas essenciais.",
  };
}

async function setUserPermissions(
  tx: Prisma.TransactionClient,
  userId: string,
  permissionKeys: readonly PermissionKey[],
  actorId: string,
): Promise<void> {
  const uniqueKeys = [...new Set(permissionKeys)];
  const tags = await tx.permissionTag.findMany({
    where: { key: { in: uniqueKeys }, isActive: true },
    select: { id: true, key: true },
  });
  const tagByKey = new Map(tags.map((tag) => [tag.key, tag.id]));
  const tagIds = tags.map((tag) => tag.id);

  await tx.userPermissionTag.updateMany({
    where: {
      userProfileId: userId,
      isActive: true,
      permissionTagId: { notIn: tagIds },
    },
    data: { isActive: false, revokedAt: new Date(), revokedById: actorId },
  });

  for (const key of uniqueKeys) {
    const permissionTagId = tagByKey.get(key);
    if (!permissionTagId) continue;
    await tx.userPermissionTag.upsert({
      where: {
        userProfileId_permissionTagId: {
          userProfileId: userId,
          permissionTagId,
        },
      },
      update: {
        isActive: true,
        grantedById: actorId,
        grantedAt: new Date(),
        revokedAt: null,
        revokedById: null,
      },
      create: {
        userProfileId: userId,
        permissionTagId,
        grantedById: actorId,
      },
    });
  }
}

async function revokeAllPermissions(
  tx: Prisma.TransactionClient,
  userId: string,
  actorId: string,
): Promise<void> {
  await tx.userPermissionTag.updateMany({
    where: { userProfileId: userId, isActive: true },
    data: { isActive: false, revokedAt: new Date(), revokedById: actorId },
  });
}

function revalidateAdminPaths() {
  revalidatePath("/configuracoes");
  revalidatePath("/configuracoes/usuarios");
  revalidatePath("/configuracoes/permissoes");
  revalidatePath("/configuracoes/auditoria");
}
