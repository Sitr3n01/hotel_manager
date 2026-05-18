import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { listProducts } from "@/lib/actions/product";
import { listReservationsForConsumption } from "@/lib/actions/reservation-consumption";
import { CozinhaPageClient } from "@/components/cozinha/cozinha-page-client";
import { serializeProductForClient } from "@/lib/client-serialization";
import { hasAnyPermission } from "@/lib/permissions";

export default async function CozinhaPage() {
  const user = await requireAuth();
  if (!hasAnyPermission(user, ["ACCESS_KITCHEN", "KITCHEN_READ"])) redirect("/dashboard");

  const [products, reservations] = await Promise.all([
    listProducts({ includeInactive: false }),
    listReservationsForConsumption(),
  ]);

  return (
    <CozinhaPageClient
      userId={user.id}
      userRole={user.role}
      products={products.map(serializeProductForClient)}
      reservations={reservations}
    />
  );
}
