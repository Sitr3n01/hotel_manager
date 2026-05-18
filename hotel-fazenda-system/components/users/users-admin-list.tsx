"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, Lock, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import type { Role, UserStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveUserWithPreset, blockUser, reactivateUser, rejectUser } from "@/lib/actions/users";
import type { UserAdminListItem } from "@/lib/queries/users";
import {
  approvalRole,
  EDITABLE_ROLES,
  ROLE_LABELS,
  STATUS_LABELS,
  type RunUserAction,
} from "@/components/users/users-admin-shared";

export function UsersAdminHeader() {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-medium tracking-tight">Usuários e permissões</h1>
      <p className="text-sm text-muted-foreground">
        Aprove solicitações, bloqueie acessos e ajuste tags liberadas por funcionário.
      </p>
    </header>
  );
}

export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function UsersFilterBar({
  query,
  status,
  role,
  onQueryChange,
  onStatusChange,
  onRoleChange,
}: {
  query: string;
  status: UserStatus | "ALL";
  role: Role | "ALL";
  onQueryChange: Dispatch<SetStateAction<string>>;
  onStatusChange: Dispatch<SetStateAction<UserStatus | "ALL">>;
  onRoleChange: Dispatch<SetStateAction<Role | "ALL">>;
}) {
  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail ou telefone"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <StatusFilter value={status} onChange={onStatusChange} />
        <RoleFilter value={role} onChange={onRoleChange} />
      </CardContent>
    </Card>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: UserStatus | "ALL";
  onChange: Dispatch<SetStateAction<UserStatus | "ALL">>;
}) {
  return (
    <select
      className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value as UserStatus | "ALL")}
    >
      <option value="ALL">Todos os status</option>
      {Object.entries(STATUS_LABELS).map(([status, label]) => (
        <option key={status} value={status}>
          {label}
        </option>
      ))}
    </select>
  );
}

function RoleFilter({
  value,
  onChange,
}: {
  value: Role | "ALL";
  onChange: Dispatch<SetStateAction<Role | "ALL">>;
}) {
  return (
    <select
      className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value as Role | "ALL")}
    >
      <option value="ALL">Todos os perfis</option>
      {EDITABLE_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

export function PendingUsersSection({
  users,
  disabled,
  onRun,
}: {
  users: UserAdminListItem[];
  disabled: boolean;
  onRun: RunUserAction;
}) {
  if (users.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium">Solicitações pendentes</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {users.map((user) => (
          <PendingUserCard key={user.id} user={user} disabled={disabled} onRun={onRun} />
        ))}
      </div>
    </section>
  );
}

function PendingUserCard({
  user,
  disabled,
  onRun,
}: {
  user: UserAdminListItem;
  disabled: boolean;
  onRun: RunUserAction;
}) {
  return (
    <Card className="border-warning/30">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">{user.name}</h3>
            <Badge variant="secondary">{ROLE_LABELS[user.requestedRole ?? "UNASSIGNED"]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.requestMessage ? (
            <p className="text-sm text-muted-foreground">{user.requestMessage}</p>
          ) : null}
        </div>
        <PendingUserActions user={user} disabled={disabled} onRun={onRun} />
      </CardContent>
    </Card>
  );
}

function PendingUserActions({
  user,
  disabled,
  onRun,
}: {
  user: UserAdminListItem;
  disabled: boolean;
  onRun: RunUserAction;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => onRun(() => approveUserWithPreset(user.id, approvalRole(user.requestedRole)))}
      >
        <Check className="h-4 w-4" />
        Aprovar
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => rejectWithPrompt(user, onRun)}
      >
        <X className="h-4 w-4" />
        Rejeitar
      </Button>
    </div>
  );
}

export function UsersTable({
  users,
  selectedId,
  disabled,
  currentUserId,
  onSelect,
  onRun,
}: {
  users: UserAdminListItem[];
  selectedId: string | null;
  disabled: boolean;
  currentUserId: string;
  onSelect: Dispatch<SetStateAction<string | null>>;
  onRun: RunUserAction;
}) {
  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelected={user.id === selectedId}
                disabled={disabled}
                isCurrentUser={user.id === currentUserId}
                onRun={onRun}
                onSelect={onSelect}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UserRow({
  user,
  isSelected,
  disabled,
  isCurrentUser,
  onSelect,
  onRun,
}: {
  user: UserAdminListItem;
  isSelected: boolean;
  disabled: boolean;
  isCurrentUser: boolean;
  onSelect: Dispatch<SetStateAction<string | null>>;
  onRun: RunUserAction;
}) {
  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell>
        <button type="button" className="text-left" onClick={() => onSelect(user.id)}>
          <span className="block font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
        </button>
      </TableCell>
      <TableCell>
        <StatusBadge status={user.status} isActive={user.isActive} />
      </TableCell>
      <TableCell>{ROLE_LABELS[user.role]}</TableCell>
      <TableCell>{user.permissions.length}</TableCell>
      <TableCell>
        <UserRowActions
          user={user}
          disabled={disabled}
          isCurrentUser={isCurrentUser}
          onRun={onRun}
          onSelect={onSelect}
        />
      </TableCell>
    </TableRow>
  );
}

function UserRowActions({
  user,
  disabled,
  isCurrentUser,
  onSelect,
  onRun,
}: {
  user: UserAdminListItem;
  disabled: boolean;
  isCurrentUser: boolean;
  onSelect: Dispatch<SetStateAction<string | null>>;
  onRun: RunUserAction;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={() => onSelect(user.id)}>
        <ShieldCheck className="h-4 w-4" />
        Tags
      </Button>
      <UserStatusAction
        user={user}
        disabled={disabled || isCurrentUser}
        isCurrentUser={isCurrentUser}
        onRun={onRun}
      />
    </div>
  );
}

function UserStatusAction({
  user,
  disabled,
  isCurrentUser,
  onRun,
}: {
  user: UserAdminListItem;
  disabled: boolean;
  isCurrentUser: boolean;
  onRun: RunUserAction;
}) {
  if (isCurrentUser) return null;

  if (user.status === "APPROVED") {
    return (
      <Button
        size="icon-sm"
        variant="destructive"
        aria-label={`Bloquear ${user.name}`}
        disabled={disabled}
        onClick={() => onRun(() => blockUser(user.id))}
      >
        <Lock className="h-4 w-4" />
      </Button>
    );
  }

  if (user.status === "BLOCKED" || user.status === "INACTIVE") {
    return (
      <Button
        size="icon-sm"
        variant="outline"
        aria-label={`Reativar ${user.name}`}
        disabled={disabled}
        onClick={() => onRun(() => reactivateUser(user.id))}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    );
  }

  return null;
}

function StatusBadge({ status, isActive }: { status: UserStatus; isActive: boolean }) {
  const variant = status === "APPROVED" && isActive ? "secondary" : "outline";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

function rejectWithPrompt(user: UserAdminListItem, onRun: RunUserAction) {
  const reason = window.prompt("Motivo da rejeição");
  if (reason) onRun(() => rejectUser(user.id, { reason }));
}
