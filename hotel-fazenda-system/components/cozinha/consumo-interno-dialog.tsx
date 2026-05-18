"use client";

import { ChefHat } from "lucide-react";
import { SimpleStockMovementDialog } from "@/components/shared/stock-movement-fields";
import { enqueueOrCreateInternalConsumption } from "@/lib/sync/queue-actions";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

export function ConsumoInternoDialog({
  products,
  userId,
  onDone,
}: {
  products: ProductWithCategory[];
  userId: string;
  onDone: () => void;
}) {
  return (
    <SimpleStockMovementDialog
      products={products}
      onDone={onDone}
      createMovement={(input) => enqueueOrCreateInternalConsumption(input, userId)}
      icon={<ChefHat className="h-4 w-4" />}
      triggerLabel="Registrar consumo interno"
      triggerVariant="outline"
      title="Consumo interno"
      description="Usado pela equipe ou pela casa, sem cobrar de hóspede. Motivo é opcional."
      reasonLabel="Observação (opcional)"
      reasonPlaceholder="Ex: Almoço da equipe"
      submitLabel="Registrar"
    />
  );
}
