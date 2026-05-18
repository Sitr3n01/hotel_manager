import type { Role, UserStatus } from "@prisma/client";
import type { UserAdminListItem } from "@/lib/queries/users";
import type { PermissionKey } from "@/lib/permissions";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  GERENCIA: "Gerência",
  SECRETARIA: "Secretaria",
  COZINHA: "Cozinha",
  FINANCEIRO: "Financeiro",
  UNASSIGNED: "Sem perfil",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  BLOCKED: "Bloqueado",
  INACTIVE: "Inativo",
};

export const EDITABLE_ROLES: Role[] = [
  "ADMIN",
  "GERENCIA",
  "SECRETARIA",
  "COZINHA",
  "FINANCEIRO",
  "UNASSIGNED",
];

export const PRESET_ROLES: Exclude<Role, "UNASSIGNED">[] = [
  "ADMIN",
  "GERENCIA",
  "SECRETARIA",
  "COZINHA",
  "FINANCEIRO",
];

export const SELF_ADMIN_LOCK_PERMISSIONS: PermissionKey[] = [
  "ACCESS_USERS_ADMIN",
  "USERS_READ",
  "USERS_UPDATE_TAGS",
];

export type UserActionResult = { success: boolean; error?: string };
export type RunUserAction = (action: () => Promise<UserActionResult>) => void;

export function approvalRole(role: Role | null): Exclude<Role, "UNASSIGNED"> {
  return role && role !== "UNASSIGNED" ? role : "SECRETARIA";
}

export function applyUserFilters(
  users: UserAdminListItem[],
  filters: { query: string; status: UserStatus | "ALL"; role: Role | "ALL" },
): UserAdminListItem[] {
  const normalized = filters.query.trim().toLowerCase();

  return users.filter((user) => {
    const matchesQuery =
      !normalized ||
      user.name.toLowerCase().includes(normalized) ||
      user.email.toLowerCase().includes(normalized) ||
      user.phone?.toLowerCase().includes(normalized);
    const matchesStatus = filters.status === "ALL" || user.status === filters.status;
    const matchesRole = filters.role === "ALL" || user.role === filters.role;
    return matchesQuery && matchesStatus && matchesRole;
  });
}
