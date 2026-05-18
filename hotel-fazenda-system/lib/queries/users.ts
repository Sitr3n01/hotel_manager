import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { normalizePermissionKeys, type PermissionKey } from "@/lib/auth/permissions";
import type { Role, UserStatus } from "@prisma/client";

export type UserAdminListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  requestedRole: Role | null;
  requestMessage: string | null;
  status: UserStatus;
  isActive: boolean;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: PermissionKey[];
};

export type UserAdminFilters = {
  status?: UserStatus;
  role?: Role;
  search?: string;
};

export async function listUsersForAdmin(filters: UserAdminFilters = {}): Promise<UserAdminListItem[]> {
  await requireAnyPermission(["USERS_READ", "ACCESS_USERS_ADMIN"]);

  const users = await prisma.userProfile.findMany({
    where: buildUserWhere(filters),
    include: {
      permissionTags: {
        where: { isActive: true, permissionTag: { isActive: true } },
        include: { permissionTag: { select: { key: true } } },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    requestedRole: user.requestedRole,
    requestMessage: user.requestMessage,
    status: user.status,
    isActive: user.isActive,
    approvedAt: user.approvedAt,
    rejectedAt: user.rejectedAt,
    rejectionReason: user.rejectionReason,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions: normalizePermissionKeys(user.permissionTags.map((entry) => entry.permissionTag.key)),
  }));
}

export async function listAuditLogsForAdmin() {
  await requireAnyPermission(["AUDIT_LOGS_READ", "ACCESS_USERS_ADMIN"]);

  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

function buildUserWhere(filters: UserAdminFilters) {
  const where: {
    status?: UserStatus;
    role?: Role;
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (filters.status) where.status = filters.status;
  if (filters.role) where.role = filters.role;
  if (filters.search?.trim()) {
    const query = filters.search.trim();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
    ];
  }

  return where;
}
