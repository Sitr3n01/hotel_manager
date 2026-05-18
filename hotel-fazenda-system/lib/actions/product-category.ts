"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { canViewProducts, hasPermission } from "@/lib/permissions";
import {
  createProductCategorySchema,
  updateProductCategorySchema,
  type CreateProductCategoryInput,
  type UpdateProductCategoryInput,
} from "@/lib/validations/product-category";
import { Prisma, type ProductCategory } from "@prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function listProductCategories(includeInactive = false) {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!canViewProducts(user)) return [];

  return prisma.productCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createProductCategory(
  input: CreateProductCategoryInput,
): Promise<ActionResult<ProductCategory>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "STOCK_CREATE_PRODUCT")) {
    return { success: false, error: "Sem permissão para gerenciar categorias" };
  }

  const parsed = createProductCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const category = await prisma.productCategory.create({
      data: normalizeStrings(parsed.data),
    });
    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "ProductCategory",
      entityId: category.id,
      afterData: category,
    });
    revalidatePath("/estoque");
    return { success: true, data: category };
  } catch (error) {
    return toCategoryError(error);
  }
}

export async function updateProductCategory(
  id: string,
  input: UpdateProductCategoryInput,
): Promise<ActionResult<ProductCategory>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "STOCK_UPDATE_PRODUCT")) {
    return { success: false, error: "Sem permissão para gerenciar categorias" };
  }

  const parsed = updateProductCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!before) return { success: false, error: "Categoria não encontrada" };

  try {
    const category = await prisma.productCategory.update({
      where: { id },
      data: normalizeStrings(parsed.data),
    });
    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "ProductCategory",
      entityId: id,
      beforeData: before,
      afterData: category,
    });
    revalidatePath("/estoque");
    return { success: true, data: category };
  } catch (error) {
    return toCategoryError(error);
  }
}

export async function deactivateProductCategory(
  id: string,
): Promise<ActionResult<ProductCategory>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };
  if (!hasPermission(user, "STOCK_DEACTIVATE_PRODUCT")) {
    return { success: false, error: "Sem permissão para gerenciar categorias" };
  }

  const before = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!before) return { success: false, error: "Categoria não encontrada" };

  try {
    if (before._count.products > 0) {
      return {
        success: false,
        error: "Categoria possui produtos vinculados. Inative os produtos antes.",
      };
    }
    const category = await prisma.productCategory.update({
      where: { id },
      data: { isActive: false },
    });
    await logAudit({
      actorId: user.id,
      action: "DEACTIVATE",
      entity: "ProductCategory",
      entityId: id,
      beforeData: before,
      afterData: category,
    });
    revalidatePath("/estoque");
    return { success: true, data: category };
  } catch (error) {
    return toCategoryError(error);
  }
}

function normalizeStrings<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value === "" ? null : value;
  }
  return out as T;
}

function toCategoryError(error: unknown): ActionResult<ProductCategory> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { success: false, error: "Já existe uma categoria com esse nome." };
    }
    if (error.code === "P2003") {
      return {
        success: false,
        error: "Categoria possui produtos vinculados e não pode ser removida.",
      };
    }
  }
  return { success: false, error: "Não foi possível salvar a categoria. Tente novamente." };
}
