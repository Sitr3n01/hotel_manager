import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { canViewFinancial } from "@/lib/permissions";
import {
  getClosingSummary,
  listFinancialClosings,
  listReservationsReadyForClosing,
} from "@/lib/actions/financial-closing";
import { FinanceiroPageClient } from "@/components/financeiro/financeiro-page-client";
import type { PaymentStatus } from "@prisma/client";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth();
  if (!canViewFinancial(user)) redirect("/dashboard");

  const params = await searchParams;
  const currentStatus = parsePaymentStatus(params.paymentStatus);
  const currentFrom = typeof params.from === "string" ? params.from : undefined;
  const currentTo = typeof params.to === "string" ? params.to : undefined;
  const from = currentFrom ? new Date(`${currentFrom}T00:00:00`) : undefined;
  const to = currentTo ? new Date(`${currentTo}T23:59:59`) : undefined;

  const [summary, closings, pendingReservations] = await Promise.all([
    getClosingSummary({ from, to }),
    listFinancialClosings({
      paymentStatus: currentStatus === "ALL" ? undefined : currentStatus,
      from,
      to,
    }),
    listReservationsReadyForClosing(),
  ]);

  return (
    <FinanceiroPageClient
      userRole={user.role}
      summary={summary}
      closings={closings}
      pendingReservations={pendingReservations}
      currentStatus={currentStatus}
      currentFrom={currentFrom}
      currentTo={currentTo}
    />
  );
}

function parsePaymentStatus(value: string | string[] | undefined): PaymentStatus | "ALL" {
  if (typeof value !== "string") return "ALL";
  if (["PENDING", "PARTIAL", "PAID", "CANCELLED"].includes(value)) {
    return value as PaymentStatus;
  }
  return "ALL";
}
