import { describe, expect, it, vi, beforeEach } from "vitest";

const { getCurrentUser, logAudit, revalidatePath, prismaMock } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
  prismaMock: {
    guest: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    reservation: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser }));
vi.mock("@/lib/audit", () => ({ logAudit }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { createGuest, updateGuest, deleteGuest } from "@/lib/actions/guest";

const ADMIN = {
  id: "user-1",
  role: "ADMIN" as const,
  isActive: true,
  email: "admin@local",
  name: "Admin",
  authUserId: "auth-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const COZINHA = { ...ADMIN, id: "user-2", role: "COZINHA" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createGuest", () => {
  it("bloqueia quando não autenticado", async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await createGuest({ name: "João" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Não autenticado");
    expect(prismaMock.guest.create).not.toHaveBeenCalled();
  });

  it("bloqueia perfil sem permissão (COZINHA)", async () => {
    getCurrentUser.mockResolvedValue(COZINHA);

    const result = await createGuest({ name: "João" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Sem permissão");
    expect(prismaMock.guest.create).not.toHaveBeenCalled();
  });

  it("rejeita dados inválidos com fieldErrors", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);

    const result = await createGuest({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("cria hóspede e dispara audit log", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const created = { id: "guest-1", name: "João" };
    prismaMock.guest.create.mockResolvedValue(created);

    const result = await createGuest({ name: "João", email: "joao@example.com" });

    expect(result.success).toBe(true);
    expect(prismaMock.guest.create).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user-1",
        action: "CREATE",
        entity: "Guest",
        entityId: "guest-1",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/hospedes");
  });

  it("converte string vazia em null antes de salvar", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    prismaMock.guest.create.mockResolvedValue({ id: "g1", name: "João" });

    await createGuest({ name: "João", phone: "", document: "" });

    const data = prismaMock.guest.create.mock.calls[0][0].data;
    expect(data.phone).toBeNull();
    expect(data.document).toBeNull();
  });
});

describe("updateGuest", () => {
  it("retorna 404 quando hóspede não existe", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    prismaMock.guest.findUnique.mockResolvedValue(null);

    const result = await updateGuest("missing", { name: "Novo" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("não encontrado");
  });

  it("atualiza hóspede e dispara audit log com before/after", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const before = { id: "g1", name: "João", phone: null };
    const after = { id: "g1", name: "João Silva", phone: null };
    prismaMock.guest.findUnique.mockResolvedValue(before);
    prismaMock.guest.update.mockResolvedValue(after);

    const result = await updateGuest("g1", { name: "João Silva" });

    expect(result.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entity: "Guest",
        entityId: "g1",
        beforeData: before,
        afterData: after,
      }),
    );
  });
});

describe("deleteGuest", () => {
  it("inativa hóspede sem apagar histórico e dispara audit DEACTIVATE", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    const before = { id: "g1", name: "João" };
    const after = { ...before, isActive: false };
    prismaMock.guest.findUnique.mockResolvedValue(before);
    prismaMock.guest.update.mockResolvedValue(after);

    const result = await deleteGuest("g1");

    expect(result.success).toBe(true);
    expect(prismaMock.guest.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { isActive: false },
    });
    expect(prismaMock.guest.delete).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DEACTIVATE",
        entity: "Guest",
        entityId: "g1",
        beforeData: before,
        afterData: after,
      }),
    );
  });

  it("retorna 404 quando hóspede não existe ao inativar", async () => {
    getCurrentUser.mockResolvedValue(ADMIN);
    prismaMock.guest.findUnique.mockResolvedValue(null);

    const result = await deleteGuest("g1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("não encontrado");
  });
});
