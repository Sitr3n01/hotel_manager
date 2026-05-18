import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { canViewGuests } from "@/lib/permissions";
import { HospedesPageClient } from "@/components/hospedes/hospedes-page-client";

export default async function HospedesPage() {
  const user = await requireAuth();

  if (!canViewGuests(user)) {
    redirect("/dashboard");
  }

  const guests = await prisma.guest.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { reservations: true } } },
  });

  return <HospedesPageClient userRole={user.role} guests={guests} />;
}
