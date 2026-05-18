"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  CalendarRange,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PendingBadge } from "@/components/sync/pending-badge";
import { hasAnyPermission, type PermissionKey } from "@/lib/permissions";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["ACCESS_DASHBOARD"],
  },
  {
    href: "/quartos",
    label: "Quartos",
    icon: BedDouble,
    anyPermissions: ["ACCESS_ROOMS", "ROOMS_READ"],
  },
  {
    href: "/reservas",
    label: "Reservas",
    icon: CalendarRange,
    anyPermissions: ["ACCESS_RESERVATIONS", "RESERVATIONS_READ"],
  },
  {
    href: "/hospedes",
    label: "Hóspedes",
    icon: Users,
    anyPermissions: ["ACCESS_GUESTS", "GUESTS_READ"],
  },
  {
    href: "/cozinha",
    label: "Cozinha",
    icon: ChefHat,
    anyPermissions: ["ACCESS_KITCHEN", "KITCHEN_READ"],
  },
  {
    href: "/estoque",
    label: "Estoque",
    icon: Package,
    anyPermissions: ["ACCESS_STOCK", "STOCK_READ"],
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
    anyPermissions: ["ACCESS_FINANCIAL", "FINANCIAL_READ"],
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: ClipboardList,
    anyPermissions: [
      "ACCESS_REPORTS",
      "REPORTS_READ_OPERATIONAL",
      "REPORTS_READ_KITCHEN",
      "REPORTS_READ_FINANCIAL",
    ],
  },
  {
    href: "/sincronizacao",
    label: "Sincronização",
    icon: RefreshCw,
    showBadge: true,
    anyPermissions: ["ACCESS_DASHBOARD"],
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    anyPermissions: ["ACCESS_SETTINGS", "ACCESS_USERS_ADMIN", "USERS_READ"],
  },
] as const satisfies readonly {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
  anyPermissions: readonly PermissionKey[];
}[];

export function AppSidebar({ permissions }: { permissions: PermissionKey[] }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => hasAnyPermission(permissions, item.anyPermissions));

  return (
    <aside
      className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col"
      aria-label="Navegação principal"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <span className="text-sm font-semibold">HF</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium">Hotel Fazenda</p>
          <p className="text-[11px] text-muted-foreground">Gestão</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Áreas do sistema">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span>{item.label}</span>
              {"showBadge" in item && item.showBadge ? <PendingBadge /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        Sprint 8 · permissões
      </div>
    </aside>
  );
}
