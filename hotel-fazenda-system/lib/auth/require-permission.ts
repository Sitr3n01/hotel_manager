import "server-only";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/require-auth";
import { hasAnyPermission, hasPermission, type PermissionKey } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/get-current-user";

export class AuthorizationError extends Error {
  constructor(message = "Sem permissão para executar esta ação") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requirePermission(permission: PermissionKey): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    await logDeniedAccess(user, [permission]);
    redirect("/dashboard");
  }
  return user;
}

export async function requireAnyPermission(permissions: readonly PermissionKey[]): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!hasAnyPermission(user, permissions)) {
    await logDeniedAccess(user, permissions);
    redirect("/dashboard");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireAnyPermission(["ACCESS_USERS_ADMIN", "USERS_READ", "USERS_UPDATE_TAGS"]);
}

export async function assertPermission(
  user: CurrentUser,
  permission: PermissionKey,
  message?: string,
): Promise<void> {
  if (!hasPermission(user, permission)) {
    await logDeniedAccess(user, [permission]);
    throw new AuthorizationError(message);
  }
}

export async function assertAnyPermission(
  user: CurrentUser,
  permissions: readonly PermissionKey[],
  message?: string,
): Promise<void> {
  if (!hasAnyPermission(user, permissions)) {
    await logDeniedAccess(user, permissions);
    throw new AuthorizationError(message);
  }
}

export async function logDeniedAccess(user: CurrentUser, permissions: readonly PermissionKey[]) {
  await logAudit({
    actorId: user.id,
    action: "ACCESS_DENIED",
    entity: "UserProfile",
    entityId: user.id,
    metadata: { requiredPermissions: permissions },
  });
}
