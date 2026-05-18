import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { listProducts } from "@/lib/actions/product";
import { listProductCategories } from "@/lib/actions/product-category";
import { listStockMovements } from "@/lib/actions/stock-movement";
import { EstoquePageClient } from "@/components/estoque/estoque-page-client";
import { serializeMovementForClient, serializeProductForClient } from "@/lib/client-serialization";
import { canViewProducts } from "@/lib/permissions";

export default async function EstoquePage() {
  const user = await requireAuth();
  if (!canViewProducts(user)) redirect("/dashboard");

  const [products, categories, movements] = await Promise.all([
    listProducts({ includeInactive: false }),
    listProductCategories(true),
    listStockMovements(),
  ]);

  return (
    <EstoquePageClient
      userId={user.id}
      userRole={user.role}
      products={products.map(serializeProductForClient)}
      categories={categories}
      movements={movements.map(serializeMovementForClient)}
    />
  );
}
