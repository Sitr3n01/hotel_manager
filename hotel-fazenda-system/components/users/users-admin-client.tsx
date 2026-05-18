"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role, UserStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { applyUserFilters, type RunUserAction } from "@/components/users/users-admin-shared";
import {
  ActionError,
  PendingUsersSection,
  UsersAdminHeader,
  UsersFilterBar,
  UsersTable,
} from "@/components/users/users-admin-list";
import { PermissionEditor } from "@/components/users/user-permission-editor";
import type { UserAdminListItem } from "@/lib/queries/users";

export function UsersAdminClient({
  users,
  currentUserId,
}: {
  users: UserAdminListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserStatus | "ALL">("ALL");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.id ?? null);

  const filteredUsers = useMemo(
    () => applyUserFilters(users, { query, role, status }),
    [query, role, status, users],
  );
  const pendingUsers = filteredUsers.filter((user) => user.status === "PENDING");
  const selectedUser = users.find((user) => user.id === selectedId) ?? users[0] ?? null;

  const run: RunUserAction = (action) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Não foi possível concluir a ação.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <UsersAdminHeader />
      <ActionError message={error} />
      <UsersFilterBar
        query={query}
        role={role}
        status={status}
        onQueryChange={setQuery}
        onRoleChange={setRole}
        onStatusChange={setStatus}
      />
      <PendingUsersSection users={pendingUsers} disabled={isPending} onRun={run} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <UsersTable
          users={filteredUsers}
          selectedId={selectedId}
          disabled={isPending}
          currentUserId={currentUserId}
          onRun={run}
          onSelect={setSelectedId}
        />
        {selectedUser ? (
          <PermissionEditor
            key={selectedUser.id}
            user={selectedUser}
            disabled={isPending}
            isEditingSelf={selectedUser.id === currentUserId}
            onRun={run}
          />
        ) : null}
      </div>
    </div>
  );
}
