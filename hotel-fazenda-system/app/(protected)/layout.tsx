import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/require-auth";
import { ProtectedShell } from "@/components/layout/protected-shell";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  return (
    <ProtectedShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      }}
    >
      {children}
    </ProtectedShell>
  );
}
