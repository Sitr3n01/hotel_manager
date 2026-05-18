import Link from "next/link";
import type { ReactNode } from "react";
import { FileClock, KeyRound, Mail, ShieldCheck, UserCircle, Users } from "lucide-react";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/get-current-user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Role } from "@prisma/client";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  GERENCIA: "Gerência",
  SECRETARIA: "Secretaria",
  COZINHA: "Cozinha",
  FINANCEIRO: "Financeiro",
  UNASSIGNED: "Sem perfil",
};

export default async function ConfiguracoesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SettingsHeader />
      <AccountCard user={user} />
      <AdminLinksSection user={user} />
    </div>
  );
}

function SettingsHeader() {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-medium tracking-tight">Configurações</h1>
      <p className="text-sm text-muted-foreground">
        Dados da sua conta e áreas administrativas liberadas para o seu perfil.
      </p>
    </header>
  );
}

function AccountCard({ user }: { user: CurrentUser }) {
  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="p-6">
        <AccountCardHeader user={user} />
        <AccountDetails user={user} />
      </CardContent>
    </Card>
  );
}

function AccountCardHeader({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-start gap-4 border-b border-border pb-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserCircle className="h-6 w-6" />
      </div>
      <div className="flex-1 space-y-1">
        <h2 className="text-lg font-medium">{user.name}</h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          {user.email}
        </p>
      </div>
      <Badge variant={user.isActive ? "secondary" : "destructive"} className="font-normal">
        {user.isActive ? "Ativo" : "Inativo"}
      </Badge>
    </div>
  );
}

function AccountDetails({ user }: { user: CurrentUser }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 pt-6 sm:grid-cols-2">
      <DetailRow label="Perfil de acesso" value={<RoleValue role={user.role} />} />
      <DetailRow label="Status" value={user.status} />
      <DetailRow label="Conta criada em" value={formatAccountDate(user.createdAt)} />
      <DetailRow label="Tags ativas" value={user.permissions.length.toString()} />
    </dl>
  );
}

function RoleValue({ role }: { role: Role }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ShieldCheck className="h-4 w-4 text-primary" />
      {ROLE_LABELS[role]}
    </span>
  );
}

function AdminLinksSection({ user }: { user: CurrentUser }) {
  if (!hasAnyPermission(user, ["ACCESS_USERS_ADMIN", "USERS_READ", "AUDIT_LOGS_READ"])) {
    return null;
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {hasPermission(user, "USERS_READ") ? <UsersAdminLink /> : null}
      {hasAnyPermission(user, ["USERS_READ", "USERS_UPDATE_TAGS"]) ? (
        <PermissionsAdminLink />
      ) : null}
      {hasPermission(user, "AUDIT_LOGS_READ") ? <AuditAdminLink /> : null}
    </section>
  );
}

function UsersAdminLink() {
  return (
    <AdminLink
      href="/configuracoes/usuarios"
      icon={<Users className="h-5 w-5" />}
      title="Usuários"
      description="Aprovar, bloquear e editar permissões."
    />
  );
}

function PermissionsAdminLink() {
  return (
    <AdminLink
      href="/configuracoes/permissoes"
      icon={<KeyRound className="h-5 w-5" />}
      title="Permissões"
      description="Consultar tags e presets oficiais."
    />
  );
}

function AuditAdminLink() {
  return (
    <AdminLink
      href="/configuracoes/auditoria"
      icon={<FileClock className="h-5 w-5" />}
      title="Auditoria"
      description="Ver ações críticas registradas."
    />
  );
}

function AdminLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function formatAccountDate(value: Date): string {
  return value.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
