import { describe, expect, it } from "vitest";
import {
  canTransitionRoomStatus,
  getAllowedNextRoomStatuses,
  getRoomStatusLabel,
  isRoomStatus,
} from "@/lib/room-status";

describe("room status helpers", () => {
  it("traduz status para portugues de interface", () => {
    expect(getRoomStatusLabel("AVAILABLE")).toBe("Disponível");
    expect(getRoomStatusLabel("BLOCKED")).toBe("Bloqueado");
  });

  it("expoe apenas proximos status operacionais permitidos", () => {
    expect(getAllowedNextRoomStatuses("AVAILABLE")).toEqual([
      "RESERVED",
      "MAINTENANCE",
      "CLEANING",
      "BLOCKED",
    ]);
  });

  it("bloqueia transicoes operacionais invalidas", () => {
    expect(canTransitionRoomStatus("AVAILABLE", "OCCUPIED")).toBe(false);
    expect(canTransitionRoomStatus("RESERVED", "OCCUPIED")).toBe(true);
  });

  it("valida valores recebidos da interface antes de trocar status", () => {
    expect(isRoomStatus("AVAILABLE")).toBe(true);
    expect(isRoomStatus(null)).toBe(false);
    expect(isRoomStatus("active")).toBe(false);
  });
});
