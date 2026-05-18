import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { canViewFinancial } from "@/lib/permissions";
import { getFinancialClosingDetail } from "@/lib/actions/financial-closing";
import { FechamentoDetailClient } from "@/components/financeiro/fechamento-detail-client";

export default async function FechamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  if (!canViewFinancial(user)) redirect("/dashboard");

  const { id } = await params;
  const detail = await getFinancialClosingDetail(id);
  if (!detail) notFound();

  return <FechamentoDetailClient detail={detail} userRole={user.role} />;
}
