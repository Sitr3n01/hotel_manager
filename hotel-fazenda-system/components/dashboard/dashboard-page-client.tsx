"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarPlus,
  DollarSign,
  DoorOpen,
  FileText,
  PackagePlus,
  Settings,
  TrendingDown,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { PermissionGate } from "@/components/dashboard/permission-gate";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { WasteChart } from "@/components/dashboard/waste-chart";
import { ConsumptionChart } from "@/components/dashboard/consumption-chart";
import { Card, CardContent } from "@/components/ui/card";
import type { PeriodPreset } from "@/lib/date-periods";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import type {
  DashboardMetrics,
  OccupancyByStatus,
  RevenueByDay,
  TopConsumed,
  WasteByCategory,
} from "@/lib/queries/dashboard";

type DashboardPageClientProps = {
  userRole: Role;
  permissions: PermissionKey[];
  userName: string;
  metrics: DashboardMetrics;
  revenueByDay: RevenueByDay;
  occupancyByStatus: OccupancyByStatus;
  wasteByCategory: WasteByCategory;
  topConsumed: TopConsumed;
  currentPreset: PeriodPreset;
  currentFrom?: string;
  currentTo?: string;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  GERENCIA: "Gerência",
  SECRETARIA: "Secretaria",
  COZINHA: "Cozinha",
  FINANCEIRO: "Financeiro",
  UNASSIGNED: "Sem perfil",
};

export function DashboardPageClient(props: DashboardPageClientProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <DashboardHeader userName={props.userName} userRole={props.userRole} />
      <DateRangeFilter
        currentPreset={props.currentPreset}
        currentFrom={props.currentFrom}
        currentTo={props.currentTo}
      />
      <MetricsGrid permissions={props.permissions} metrics={props.metrics} />
      <DashboardShortcuts permissions={props.permissions} />
      <ChartsGrid {...props} />
      <DashboardStatusSections />
    </div>
  );
}

function DashboardHeader({ userName, userRole }: { userName: string; userRole: Role }) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-medium tracking-tight">Olá, {firstName(userName)}</h1>
      <p className="text-muted-foreground text-sm">
        Dashboard do Hotel Fazenda · {ROLE_LABELS[userRole]}
      </p>
    </header>
  );
}

function MetricsGrid({
  permissions,
  metrics,
}: {
  permissions: PermissionKey[];
  metrics: DashboardMetrics;
}) {
  return (
    <section
      aria-label="Indicadores principais"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <MetricCard
        title="Quartos disponíveis"
        value={`${metrics.availableRooms}/${metrics.totalActiveRooms}`}
        description={`${metrics.availableRooms} de ${metrics.totalActiveRooms} quartos ativos`}
        icon={BedDouble}
        tone="primary"
      />
      <MetricCard
        title="Quartos ocupados"
        value={fmtInt(metrics.occupiedRooms)}
        description="Hóspedes atualmente no hotel"
        icon={DoorOpen}
        tone="info"
      />
      <MetricCard
        title="Reservas de hoje"
        value={fmtInt(metrics.todayReservations)}
        description="Check-ins previstos para hoje"
        icon={CalendarCheck}
        tone="info"
      />
      <MetricCard
        title="Check-ins hoje"
        value={fmtInt(metrics.todayCheckIns)}
        description="Hóspedes que já chegaram"
        icon={Users}
        tone="success"
      />
      <MetricCard
        title="Check-outs hoje"
        value={fmtInt(metrics.todayCheckOuts)}
        description="Hóspedes com saída prevista"
        icon={Users}
        tone="warning"
      />
      <FinancialMetrics permissions={permissions} metrics={metrics} />
      <KitchenMetrics permissions={permissions} metrics={metrics} />
    </section>
  );
}

function FinancialMetrics({
  permissions,
  metrics,
}: {
  permissions: PermissionKey[];
  metrics: DashboardMetrics;
}) {
  return (
    <PermissionGate
      permissions={permissions}
      anyPermissions={["FINANCIAL_READ", "REPORTS_READ_FINANCIAL"]}
    >
      <MetricCard
        title="Receita no período"
        value={fmtCurrency(metrics.periodRevenue)}
        description="Total recebido no período selecionado"
        icon={DollarSign}
        tone="success"
      />
      <MetricCard
        title="Pagamentos pendentes"
        value={fmtCurrency(metrics.pendingPayments)}
        description="Valor total a receber"
        icon={Wallet}
        tone="destructive"
      />
    </PermissionGate>
  );
}

function KitchenMetrics({
  permissions,
  metrics,
}: {
  permissions: PermissionKey[];
  metrics: DashboardMetrics;
}) {
  return (
    <PermissionGate
      permissions={permissions}
      anyPermissions={["KITCHEN_READ", "REPORTS_READ_KITCHEN", "STOCK_VIEW_LOW_STOCK"]}
    >
      <MetricCard
        title="Desperdício no período"
        value={fmtCurrency(metrics.periodWaste)}
        description="Custo total de desperdícios"
        icon={TrendingDown}
        tone="destructive"
      />
      <MetricCard
        title="Estoque baixo"
        value={fmtInt(metrics.lowStockCount)}
        description="Produtos abaixo do mínimo"
        icon={AlertTriangle}
        tone="warning"
      />
    </PermissionGate>
  );
}

function DashboardShortcuts({ permissions }: { permissions: PermissionKey[] }) {
  const shortcuts = [
    hasPermission(permissions, "RESERVATIONS_CREATE")
      ? { href: "/reservas", label: "Nova reserva", icon: CalendarPlus }
      : null,
    hasPermission(permissions, "GUESTS_CREATE")
      ? { href: "/hospedes", label: "Novo hóspede", icon: Users }
      : null,
    hasPermission(permissions, "KITCHEN_CREATE_CONSUMPTION")
      ? { href: "/cozinha", label: "Lançar consumo", icon: Utensils }
      : null,
    hasPermission(permissions, "STOCK_CREATE_ENTRY")
      ? { href: "/estoque", label: "Entrada de estoque", icon: PackagePlus }
      : null,
    hasPermission(permissions, "FINANCIAL_READ")
      ? { href: "/financeiro", label: "Fechamentos", icon: Wallet }
      : null,
    hasPermission(permissions, "REPORTS_READ_FINANCIAL")
      ? { href: "/relatorios", label: "Relatórios", icon: FileText }
      : null,
    hasPermission(permissions, "ACCESS_USERS_ADMIN")
      ? { href: "/configuracoes/usuarios", label: "Usuários", icon: Settings }
      : null,
  ].filter((shortcut): shortcut is { href: string; label: string; icon: LucideIcon } =>
    Boolean(shortcut),
  );

  if (shortcuts.length === 0) return null;

  return (
    <section aria-label="Atalhos liberados" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{shortcut.label}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </section>
  );
}

function ChartsGrid({
  permissions,
  revenueByDay,
  occupancyByStatus,
  wasteByCategory,
  topConsumed,
}: DashboardPageClientProps) {
  return (
    <section aria-label="Gráficos" className="grid gap-6 lg:grid-cols-2">
      <PermissionGate
        permissions={permissions}
        anyPermissions={["FINANCIAL_READ", "REPORTS_READ_FINANCIAL"]}
      >
        <ChartCard
          title="Receita por dia"
          description="Total recebido por dia no período selecionado"
        >
          <RevenueChart data={revenueByDay} />
        </ChartCard>
      </PermissionGate>
      <ChartCard title="Ocupação por status" description="Distribuição atual dos quartos ativos">
        <OccupancyChart data={occupancyByStatus} />
      </ChartCard>
      <KitchenCharts
        permissions={permissions}
        wasteByCategory={wasteByCategory}
        topConsumed={topConsumed}
      />
    </section>
  );
}

function KitchenCharts({
  permissions,
  wasteByCategory,
  topConsumed,
}: {
  permissions: PermissionKey[];
  wasteByCategory: WasteByCategory;
  topConsumed: TopConsumed;
}) {
  return (
    <PermissionGate permissions={permissions} anyPermissions={["KITCHEN_READ", "REPORTS_READ_KITCHEN"]}>
      <ChartCard
        title="Desperdício por categoria"
        description="Custo de desperdício por categoria no período"
      >
        <WasteChart data={wasteByCategory} />
      </ChartCard>
      <ChartCard
        title="Produtos mais consumidos (Top 10)"
        description="Quantidade consumida no período"
      >
        <ConsumptionChart data={topConsumed} />
      </ChartCard>
    </PermissionGate>
  );
}

function DashboardStatusSections() {
  return (
    <section aria-label="Status do sistema">
      <SystemStatusCard />
    </section>
  );
}

function SystemStatusCard() {
  return (
    <Card className="elevation-1 border-border/60">
      <CardContent className="space-y-3 p-6">
        <h2 className="text-base font-medium">Status do sistema</h2>
        <dl className="space-y-2 text-sm">
          <StatusRow label="Banco de dados" value="Operacional" />
          <StatusRow label="Autenticação" value="Operacional" />
          <StatusRow label="Permissões" value="Sprint 8" />
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Versão</dt>
            <dd className="text-muted-foreground font-mono text-xs">Sprint 8</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-success flex items-center gap-1.5 font-medium">
        <span className="bg-success h-1.5 w-1.5 rounded-full" />
        {value}
      </dd>
    </div>
  );
}

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtInt(value: number): string {
  return value.toString();
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "bem-vindo";
}
