"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { canViewProducts, hasPermission } from "@/lib/permissions";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validations/product";
import { Prisma, type Product } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

type ListProductsParams = {
  search?: string;
  categoryId?: string;
  includeInactive?: boolean;
};

export async function listProducts(params?: ListProductsParams) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewProducts(user)) return [];

  return prisma.product.findMany({
    where: buildProductWhere(params),
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    include: { category: true },
  });
}

export async function getLowStockProducts() {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!hasPermission(user, "STOCK_VIEW_LOW_STOCK")) return [];

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return products.filter((p) => p.minimumStock.greaterThan(0) && p.currentStock.lessThanOrEqualTo(p.minimumStock));
}

export async function createProduct(input: CreateProductInput): Promise<ActionResult<Product>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "STOCK_CREATE_PRODUCT")) {
    return { success: false, error: "Sem permissão para gerenciar produtos" };
  }

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const product = await prisma.product.create({ data: parsed.data });
    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      afterData: product,
    });
    revalidatePath("/estoque");
    return { success: true, data: product };
  } catch (error) {
    return toProductError(error);
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ActionResult<Product>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "STOCK_UPDATE_PRODUCT")) {
    return { success: false, error: "Sem permissão para gerenciar produtos" };
  }

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Produto não encontrado" };

  try {
    const product = await prisma.product.update({ where: { id }, data: parsed.data });
    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      beforeData: before,
      afterData: product,
    });
    revalidatePath("/estoque");
    return { success: true, data: product };
  } catch (error) {
    return toProductError(error);
  }
}

export async function deactivateProduct(id: string): Promise<ActionResult<Product>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "STOCK_DEACTIVATE_PRODUCT")) {
    return { success: false, error: "Sem permissão para gerenciar produtos" };
  }

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return { success: false, error: "Produto não encontrado" };

  try {
    const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
    await logAudit({
      actorId: user.id,
      action: "DEACTIVATE",
      entity: "Product",
      entityId: id,
      beforeData: before,
      afterData: product,
    });
    revalidatePath("/estoque");
    return { success: true, data: product };
  } catch (error) {
    return toProductError(error);
  }
}

function buildProductWhere(params?: ListProductsParams): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (!params?.includeInactive) where.isActive = true;
  if (params?.categoryId) where.categoryId = params.categoryId;
  if (params?.search?.trim()) {
    where.name = { contains: params.search.trim(), mode: "insensitive" };
  }
  return where;
}

function toProductError(error: unknown): ActionResult<Product> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return {
        success: false,
        error: "Produto possui movimentações vinculadas e não pode ser excluído.",
      };
    }
  }
  return { success: false, error: "Não foi possível salvar o produto. Tente novamente." };
}
