"use client";

import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { hasAnyPermission, type PermissionKey } from "@/lib/permissions";

type PermissionGateProps = {
  roles?: Role[];
  userRole?: Role;
  permissions?: PermissionKey[];
  anyPermissions?: PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({
  roles,
  userRole,
  permissions,
  anyPermissions,
  children,
  fallback = null,
}: PermissionGateProps) {
  const allowedByPermission = anyPermissions?.length
    ? hasAnyPermission(permissions ?? [], anyPermissions)
    : false;
  const allowedByRole = roles?.length && userRole ? roles.includes(userRole) : false;

  if (!allowedByPermission && !allowedByRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
