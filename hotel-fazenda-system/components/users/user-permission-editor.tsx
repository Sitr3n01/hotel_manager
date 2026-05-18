"use client";

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { applyUserPreset, updateUserPermissions } from "@/lib/actions/users";
import {
  PERMISSION_LABELS,
  PERMISSION_PRESETS,
  permissionsByCategory,
  type PermissionKey,
} from "@/lib/permissions";
import type { UserAdminListItem } from "@/lib/queries/users";
import {
  EDITABLE_ROLES,
  PRESET_ROLES,
  ROLE_LABELS,
  SELF_ADMIN_LOCK_PERMISSIONS,
  type RunUserAction,
} from "@/components/users/users-admin-shared";

export function PermissionEditor({
  user,
  disabled,
  isEditingSelf,
  onRun,
}: {
  user: UserAdminListItem;
  disabled: boolean;
  isEditingSelf: boolean;
  onRun: RunUserAction;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [permissions, setPermissions] = useState<PermissionKey[]>(user.permissions);
  const grouped = useMemo(() => permissionsByCategory(), []);

  function toggle(permission: PermissionKey) {
    if (isEditingSelf && SELF_ADMIN_LOCK_PERMISSIONS.includes(permission)) return;

    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  function applyPreset(roleToApply: Exclude<Role, "UNASSIGNED">) {
    setRole(roleToApply);
    setPermissions([...PERMISSION_PRESETS[roleToApply]]);
    onRun(() => applyUserPreset(user.id, roleToApply));
  }

  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="space-y-5 p-5">
        <PermissionEditorHeader user={user} />
        <BaseRoleSelect role={role} onRoleChange={setRole} />
        <PermissionPresetButtons
          disabled={disabled}
          isEditingSelf={isEditingSelf}
          onApplyPreset={applyPreset}
        />
        <PermissionGroups
          grouped={grouped}
          permissions={permissions}
          isEditingSelf={isEditingSelf}
          onToggle={toggle}
        />
        <SavePermissionsButton
          disabled={disabled}
          onSave={() => onRun(() => updateUserPermissions({ userId: user.id, role, permissions }))}
        />
      </CardContent>
    </Card>
  );
}

function PermissionEditorHeader({ user }: { user: UserAdminListItem }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-medium">{user.name}</h2>
      <p className="text-sm text-muted-foreground">
        Alterar permissões muda as áreas e ações que este funcionário poderá acessar.
      </p>
    </div>
  );
}

function BaseRoleSelect({
  role,
  onRoleChange,
}: {
  role: Role;
  onRoleChange: Dispatch<SetStateAction<Role>>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="baseRole">Perfil base</Label>
      <select
        id="baseRole"
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        value={role}
        onChange={(event) => onRoleChange(event.target.value as Role)}
      >
        {EDITABLE_ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  );
}

function PermissionPresetButtons({
  disabled,
  isEditingSelf,
  onApplyPreset,
}: {
  disabled: boolean;
  isEditingSelf: boolean;
  onApplyPreset: (role: Exclude<Role, "UNASSIGNED">) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_ROLES.map((role) => (
        <Button
          key={role}
          size="sm"
          variant="outline"
          disabled={disabled || (isEditingSelf && role !== "ADMIN")}
          onClick={() => onApplyPreset(role)}
        >
          {ROLE_LABELS[role]}
        </Button>
      ))}
    </div>
  );
}

function PermissionGroups({
  grouped,
  permissions,
  isEditingSelf,
  onToggle,
}: {
  grouped: ReturnType<typeof permissionsByCategory>;
  permissions: PermissionKey[];
  isEditingSelf: boolean;
  onToggle: (permission: PermissionKey) => void;
}) {
  return (
    <div className="max-h-[460px] space-y-5 overflow-auto pr-1">
      {Object.entries(grouped).map(([category, items]) => (
        <fieldset key={category} className="space-y-2">
          <legend className="text-sm font-medium">{category}</legend>
          <div className="space-y-2">
            {items.map((permission) => (
              <PermissionOption
                key={permission.key}
                permission={permission.key}
                description={permission.description}
                checked={permissions.includes(permission.key)}
                disabled={isEditingSelf && SELF_ADMIN_LOCK_PERMISSIONS.includes(permission.key)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function PermissionOption({
  permission,
  description,
  checked,
  disabled,
  onToggle,
}: {
  permission: PermissionKey;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (permission: PermissionKey) => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(permission)}
      />
      <span>
        <span className="block font-medium">{PERMISSION_LABELS[permission]}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SavePermissionsButton({
  disabled,
  onSave,
}: {
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <Button className="w-full" disabled={disabled} onClick={onSave}>
      Salvar alterações
    </Button>
  );
}
