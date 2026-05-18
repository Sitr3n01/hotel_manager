"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActiveBadge, EmptyMessage, InlineTableError } from "@/components/shared/list-parts";
import { ProductFormDialog } from "@/components/produtos/product-form-dialog";
import { deactivateProduct } from "@/lib/actions/product";
import { canManageProducts } from "@/lib/permissions";
import type { ProductCategory, Role } from "@prisma/client";
import type { ProductForClient } from "@/lib/client-serialization";

export type ProductWithCategory = ProductForClient;
type CategoryWithCount = ProductCategory & { _count: { products: number } };

type Props = {
  userRole: Role;
  products: ProductWithCategory[];
  categories: CategoryWithCount[];
};

export function ProdutosTab({ userRole, products, categories }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const canManage = canManageProducts(userRole);
  const filtered = useMemo(() => filterProducts(products, search), [products, search]);

  async function handleDeactivate(p: ProductWithCategory) {
    if (!window.confirm(`Inativar o produto "${p.name}"? Histórico é preservado.`)) return;
    setActingId(p.id);
    setTableError(null);
    const r = await deactivateProduct(p.id);
    setActingId(null);
    if (!r.success) {
      setTableError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar produto..."
            className="h-9 w-72 pl-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage ? (
          <ProductFormDialog
            mode="create"
            categories={categories}
            onDone={() => router.refresh()}
          />
        ) : null}
      </div>

      <InlineTableError message={tableError} />

      {products.length === 0 ? (
        <EmptyMessage
          message="Nenhum produto cadastrado."
          hint={canManage ? 'Clique em "Novo produto" para começar.' : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyMessage message="Nenhum produto com este filtro." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Custo médio</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="w-1" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                categories={categories}
                canManage={canManage}
                acting={actingId === p.id}
                onDeactivate={handleDeactivate}
                onDone={() => router.refresh()}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ProductRow({
  product,
  categories,
  canManage,
  acting,
  onDeactivate,
  onDone,
}: {
  product: ProductWithCategory;
  categories: ProductCategory[];
  canManage: boolean;
  acting: boolean;
  onDeactivate: (p: ProductWithCategory) => void;
  onDone: () => void;
}) {
  const isLow =
    Number(product.minimumStock) > 0 &&
    Number(product.currentStock) <= Number(product.minimumStock);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {product.name}
        {isLow ? <span className="ml-2 text-xs text-amber-600">⚠ baixo</span> : null}
      </TableCell>
      <TableCell>{product.category.name}</TableCell>
      <TableCell>{product.unit}</TableCell>
      <TableCell className="text-right">{product.currentStock}</TableCell>
      <TableCell className="text-right">{product.minimumStock}</TableCell>
      <TableCell className="text-right">R$ {Number(product.averageCost).toFixed(2)}</TableCell>
      <TableCell className="text-right">
        {product.salePrice ? `R$ ${Number(product.salePrice).toFixed(2)}` : "—"}
      </TableCell>
      <TableCell>
        <ActiveBadge active={product.isActive} />
      </TableCell>
      {canManage ? (
        <TableCell>
          <div className="flex items-center gap-1">
            <ProductFormDialog
              mode="edit"
              product={product}
              categories={categories}
              onDone={onDone}
            />
            {product.isActive ? (
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={acting}
                onClick={() => onDeactivate(product)}
                title="Inativar"
              >
                {acting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="text-destructive h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function filterProducts(products: ProductWithCategory[], search: string): ProductWithCategory[] {
  const q = search.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.category.name.toLowerCase().includes(q),
  );
}
