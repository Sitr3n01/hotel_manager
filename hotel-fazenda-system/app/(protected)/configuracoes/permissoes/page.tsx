import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  PERMISSION_LABELS,
  PERMISSION_PRESETS,
  permissionsByCategory,
  type PermissionKey,
} from "@/lib/permissions";
import { requireAnyPermission } from "@/lib/auth/require-permission";

const ROLE_LABELS = {
  ADMIN: "Admin",
  GERENCIA: "Gerência",
  SECRETARIA: "Secretaria",
  COZINHA: "Cozinha",
  FINANCEIRO: "Financeiro",
  UNASSIGNED: "Sem perfil",
} as const;

export default async function PermissoesPage() {
  await requireAnyPermission(["USERS_READ", "USERS_UPDATE_TAGS", "ACCESS_USERS_ADMIN"]);
  const grouped = permissionsByCategory();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Permissões</h1>
        <p className="text-sm text-muted-foreground">
          Tags oficiais versionadas no código e presets usados pela gestão de usuários.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {Object.entries(grouped).map(([category, permissions]) => (
          <Card key={category} className="elevation-1 border-border/60">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-base font-medium">{category}</h2>
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div key={permission.key} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{permission.key}</Badge>
                      <span className="text-sm font-medium">{permission.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{permission.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Presets por perfil</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {Object.entries(PERMISSION_PRESETS).map(([role, permissions]) => (
            <Card key={role} className="elevation-1 border-border/60">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</h3>
                  <Badge variant="outline">{permissions.length} tags</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {PERMISSION_LABELS[permission as PermissionKey]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
