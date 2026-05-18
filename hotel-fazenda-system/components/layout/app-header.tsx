"use client";

import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { OnlineIndicator } from "@/components/sync/online-indicator";
import type { Role } from "@prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  GERENCIA: "Gerência",
  SECRETARIA: "Secretaria",
  COZINHA: "Cozinha",
  FINANCEIRO: "Financeiro",
  UNASSIGNED: "Sem perfil",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppHeader({ name, email, role }: { name: string; email: string; role: Role }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card px-4 elevation-1 md:px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary md:hidden">
          <span className="text-xs font-semibold">HF</span>
        </div>
        <span className="text-sm font-medium md:hidden">Hotel Fazenda</span>
      </div>
      <div className="flex items-center gap-3">
        <OnlineIndicator />
        <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
          {ROLE_LABELS[role]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-10 gap-2 rounded-full px-2 hover:bg-muted",
            )}
            aria-label={`Menu da conta de ${name}`}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline">{name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 elevation-3">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{email}</span>
                <Badge variant="secondary" className="mt-1.5 w-fit font-normal">
                  {ROLE_LABELS[role]}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-sm">
              <UserIcon className="mr-2 h-4 w-4" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
