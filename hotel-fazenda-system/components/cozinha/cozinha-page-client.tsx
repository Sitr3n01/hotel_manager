"use client";

import { useRouter } from "next/navigation";
import { ChefHat, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsumoHospedeDialog } from "@/components/cozinha/consumo-hospede-dialog";
import { DesperdicioDialog } from "@/components/cozinha/desperdicio-dialog";
import { ConsumoInternoDialog } from "@/components/cozinha/consumo-interno-dialog";
import { EntradaBatchDialog } from "@/components/estoque/entrada-batch-dialog";
import {
  canRegisterPurchase,
  canRegisterInternalConsumption,
  canRegisterReservationConsumption,
  canRegisterWaste,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";
import type { ReservationWithLight } from "@/components/cozinha/consumo-hospede-dialog";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

type Props = {
  userId: string;
  userRole: Role;
  products: ProductWithCategory[];
  reservations: ReservationWithLight[];
};

export function CozinhaPageClient({ userId, userRole, products, reservations }: Props) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Cozinha</h1>
        <p className="text-muted-foreground text-sm">
          Lançamentos rápidos do dia-a-dia. Escolha uma ação abaixo.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {canRegisterReservationConsumption(userRole) ? (
          <ActionCard
            title="Consumo do hóspede"
            description="Lance o que um hóspede consumiu — vai para o fechamento da reserva."
            icon={<UtensilsCrossed className="h-6 w-6" />}
            dialog={
              <ConsumoHospedeDialog
                reservations={reservations}
                products={products}
                userId={userId}
                onDone={refresh}
              />
            }
          />
        ) : null}

        {canRegisterWaste(userRole) ? (
          <ActionCard
            title="Desperdício"
            description="Registre alimento estragado, derramado ou descartado. Motivo é obrigatório."
            icon={<Trash2 className="h-6 w-6" />}
            dialog={<DesperdicioDialog products={products} userId={userId} onDone={refresh} />}
          />
        ) : null}

        {canRegisterInternalConsumption(userRole) ? (
          <ActionCard
            title="Consumo interno"
            description="Itens consumidos pela equipe ou pela casa — sai do estoque sem cobrar."
            icon={<ChefHat className="h-6 w-6" />}
            dialog={
              <ConsumoInternoDialog products={products} userId={userId} onDone={refresh} />
            }
          />
        ) : null}

        {canRegisterPurchase(userRole) ? (
          <ActionCard
            title="Nova entrada (compra)"
            description="Registre o que chegou do mercado. Atualiza o custo médio."
            icon={<Plus className="h-6 w-6" />}
            dialog={<EntradaBatchDialog products={products} userId={userId} onDone={refresh} />}
          />
        ) : null}
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  dialog,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  dialog: React.ReactNode;
}) {
  return (
    <Card className="elevation-1 transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
          {icon}
        </div>
        <CardTitle className="mt-3 text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{dialog}</CardContent>
    </Card>
  );
}
