"use client";

import { Trash2 } from "lucide-react";
import { SimpleStockMovementDialog } from "@/components/shared/stock-movement-fields";
import { enqueueOrCreateWaste } from "@/lib/sync/queue-actions";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";

export function DesperdicioDialog({
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
      createMovement={(input) =>
        enqueueOrCreateWaste({ ...input, reason: input.reason ?? "" }, userId)
      }
      icon={<Trash2 className="h-4 w-4" />}
      triggerLabel="Registrar desperdício"
      triggerVariant="destructive"
      title="Registrar desperdício"
      description="Produto descartado por estrago, derrame, validade etc. Motivo é obrigatório."
      reasonLabel="Motivo (obrigatório)"
      reasonPlaceholder="Ex: Caiu no chão, vencido, queimou..."
      reasonRequired
      showStock
      submitLabel="Registrar desperdício"
    />
  );
}
