import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const productCategory = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  return {
    currentUser: vi.fn(),
    audit: vi.fn(),
    refresh: vi.fn(),
    db: { productCategory },
  };
});

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.audit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));

import { deactivateProductCategory } from "@/lib/actions/product-category";

const ADMIN = {
  id: "actor-1",
  role: "ADMIN" as const,
  isActive: true,
  email: "admin@local",
  name: "Admin",
  authUserId: "auth-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CATEGORY = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  name: "Bebidas",
  description: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser.mockResolvedValue(ADMIN);
});

describe("deactivateProductCategory", () => {
  it("blocks deactivation when the category still has products", async () => {
    mocks.db.productCategory.findUnique.mockResolvedValue({
      ...CATEGORY,
      _count: { products: 2 },
    });

    const result = await deactivateProductCategory(CATEGORY.id);

    expect(result.success).toBe(false);
    expect(mocks.db.productCategory.update).not.toHaveBeenCalled();
  });

  it("deactivates an empty category and writes an audit entry", async () => {
    mocks.db.productCategory.findUnique.mockResolvedValue({
      ...CATEGORY,
      _count: { products: 0 },
    });
    mocks.db.productCategory.update.mockResolvedValue({ ...CATEGORY, isActive: false });

    const result = await deactivateProductCategory(CATEGORY.id);

    expect(result.success).toBe(true);
    expect(mocks.db.productCategory.update).toHaveBeenCalledWith({
      where: { id: CATEGORY.id },
      data: { isActive: false },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DEACTIVATE", entity: "ProductCategory" }),
    );
  });
});
