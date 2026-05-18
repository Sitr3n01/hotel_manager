"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProdutosTab } from "@/components/produtos/produtos-tab";
import { CategoriasTab } from "@/components/categorias/categorias-tab";
import { MovimentacoesTab } from "@/components/estoque/movimentacoes-tab";
import { AjustesTab } from "@/components/estoque/ajustes-tab";
import { LowStockBanner } from "@/components/estoque/low-stock-banner";
import { canAdjustStock } from "@/lib/permissions";
import type { ProductCategory, Role } from "@prisma/client";
import type { ProductWithCategory } from "@/components/produtos/produtos-tab";
import type { MovementWithRelations } from "@/components/estoque/movimentacoes-tab";

type CategoryWithCount = ProductCategory & { _count: { products: number } };

type Props = {
  userId: string;
  userRole: Role;
  products: ProductWithCategory[];
  categories: CategoryWithCount[];
  movements: MovementWithRelations[];
};

export function EstoquePageClient({ userId, userRole, products, categories, movements }: Props) {
  const showAjustes = canAdjustStock(userRole);
  const adjustmentMovements = movements.filter((m) =>
    m.type === "POSITIVE_ADJUSTMENT" || m.type === "NEGATIVE_ADJUSTMENT",
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Estoque</h1>
        <p className="text-muted-foreground text-sm">
          Produtos, categorias e movimentações. Atualize compras, ajustes e consultas.
        </p>
      </header>

      <LowStockBanner products={products} />

      <Tabs defaultValue="produtos">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          {showAjustes ? <TabsTrigger value="ajustes">Ajustes</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="produtos" className="mt-4">
          <ProdutosTab userRole={userRole} products={products} categories={categories} />
        </TabsContent>
        <TabsContent value="categorias" className="mt-4">
          <CategoriasTab userRole={userRole} categories={categories} />
        </TabsContent>
        <TabsContent value="movimentacoes" className="mt-4">
          <MovimentacoesTab
            userId={userId}
            userRole={userRole}
            movements={movements}
            products={products}
          />
        </TabsContent>
        {showAjustes ? (
          <TabsContent value="ajustes" className="mt-4">
            <AjustesTab
              userRole={userRole}
              movements={adjustmentMovements}
              products={products}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
