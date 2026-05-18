import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_PRESETS,
  canCancelReservation,
  canCloseReservation,
  canEditPaymentStatus,
  canReopenClosing,
  canViewFinancial,
  hasPermission,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";

type PermissionExpectation = {
  role: Role;
  closeReservation: boolean;
  reopenClosing: boolean;
  editPaymentStatus: boolean;
  viewFinancial: boolean;
  cancelReservation: boolean;
};

const expectations: PermissionExpectation[] = [
  {
    role: "ADMIN",
    closeReservation: true,
    reopenClosing: true,
    editPaymentStatus: true,
    viewFinancial: true,
    cancelReservation: true,
  },
  {
    role: "GERENCIA",
    closeReservation: true,
    reopenClosing: true,
    editPaymentStatus: true,
    viewFinancial: true,
    cancelReservation: true,
  },
  {
    role: "FINANCEIRO",
    closeReservation: true,
    reopenClosing: false,
    editPaymentStatus: true,
    viewFinancial: true,
    cancelReservation: false,
  },
  {
    role: "SECRETARIA",
    closeReservation: false,
    reopenClosing: false,
    editPaymentStatus: false,
    viewFinancial: false,
    cancelReservation: true,
  },
  {
    role: "COZINHA",
    closeReservation: false,
    reopenClosing: false,
    editPaymentStatus: false,
    viewFinancial: false,
    cancelReservation: false,
  },
  {
    role: "UNASSIGNED",
    closeReservation: false,
    reopenClosing: false,
    editPaymentStatus: false,
    viewFinancial: false,
    cancelReservation: false,
  },
];

describe("permissions", () => {
  it.each(expectations)("%s segue a matriz de tags por preset", (row) => {
    expect(canCloseReservation(row.role)).toBe(row.closeReservation);
    expect(canReopenClosing(row.role)).toBe(row.reopenClosing);
    expect(canEditPaymentStatus(row.role)).toBe(row.editPaymentStatus);
    expect(canViewFinancial(row.role)).toBe(row.viewFinancial);
    expect(canCancelReservation(row.role)).toBe(row.cancelReservation);
  });

  it("admin recebe todas as tags oficiais", () => {
    expect(PERMISSION_PRESETS.ADMIN).toEqual(ALL_PERMISSION_KEYS);
  });

  it("usuario real com lista de tags prevalece sobre o perfil base", () => {
    const user = {
      role: "SECRETARIA" as Role,
      permissions: ["ACCESS_FINANCIAL", "FINANCIAL_READ"] as const,
    };

    expect(canViewFinancial(user)).toBe(true);
    expect(hasPermission(user, "RESERVATIONS_CREATE")).toBe(false);
  });
});
