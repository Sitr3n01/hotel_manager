"use client";

import {
  Banknote,
  CreditCard,
  Landmark,
  QrCode,
  HelpCircle,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PaymentMethod, PaymentStatus, Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; borderClass: string }
> = {
  PENDING: {
    label: "Pendente",
    variant: "secondary",
    borderClass: "border-l-amber-400",
  },
  PARTIAL: {
    label: "Parcial",
    variant: "default",
    borderClass: "border-l-blue-400",
  },
  PAID: {
    label: "Pago",
    variant: "default",
    borderClass: "border-l-green-400",
  },
  CANCELLED: {
    label: "Cancelado",
    variant: "destructive",
    borderClass: "border-l-red-400",
  },
};

const METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string; icon: typeof Banknote }
> = {
  CASH: { label: "Dinheiro", icon: Banknote },
  PIX: { label: "PIX", icon: QrCode },
  CREDIT_CARD: { label: "Cartão de Crédito", icon: CreditCard },
  DEBIT_CARD: { label: "Cartão de Débito", icon: CreditCard },
  BANK_TRANSFER: { label: "Transferência Bancária", icon: Landmark },
  OTHER: { label: "Outro", icon: HelpCircle },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  isClosed: boolean;
  userRole: Role;
  onStatusChange?: (status: PaymentStatus, method?: PaymentMethod) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FechamentoPagamentoSection({
  paymentStatus,
  paymentMethod,
  isClosed,
}: Props) {
  const statusConfig = STATUS_CONFIG[paymentStatus];
  const methodConfig = paymentMethod ? METHOD_CONFIG[paymentMethod] : null;
  const MethodIcon = methodConfig?.icon ?? HelpCircle;

  return (
    <Card
      className={`elevation-1 border-l-4 ${statusConfig.borderClass} border-border/60`}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Pagamento</h3>
          {isClosed && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Fechado
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Método:</span>
            {methodConfig ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <MethodIcon className="h-4 w-4 text-muted-foreground" />
                {methodConfig.label}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Não definido
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
