import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { SyncProvider } from "@/lib/sync/provider";
import type { PermissionKey } from "@/lib/permissions";

type Props = {
  user: { name: string; email: string; role: Role; permissions: PermissionKey[] };
  children: ReactNode;
};

export function ProtectedShell({ user, children }: Props) {
  return (
    <SyncProvider>
      <div className="flex min-h-svh bg-background">
        <AppSidebar permissions={user.permissions} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader name={user.name} email={user.email} role={user.role} />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SyncProvider>
  );
}
