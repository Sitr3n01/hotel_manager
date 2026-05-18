import { describe, expect, it } from "vitest";
import {
  canTransitionReservationStatus,
  getAllowedNextReservationStatuses,
  getReservationStatusLabel,
  isReservationOccupying,
  isReservationTerminal,
} from "@/lib/reservation-status";

describe("getReservationStatusLabel", () => {
  it("traduz status para portugues", () => {
    expect(getReservationStatusLabel("PRE_RESERVED")).toBe("Pré-reserva");
    expect(getReservationStatusLabel("CHECKED_IN")).toBe("Hospedada");
    expect(getReservationStatusLabel("NO_SHOW")).toBe("No-show");
  });
});

describe("getAllowedNextReservationStatuses", () => {
  it("PRE_RESERVED pode confirmar ou cancelar", () => {
    expect(getAllowedNextReservationStatuses("PRE_RESERVED")).toEqual(["CONFIRMED", "CANCELLED"]);
  });

  it("CONFIRMED pode hospedar, cancelar ou no-show", () => {
    expect(getAllowedNextReservationStatuses("CONFIRMED")).toEqual([
      "CHECKED_IN",
      "CANCELLED",
      "NO_SHOW",
    ]);
  });

  it("CHECKED_IN só pode finalizar (check-out)", () => {
    expect(getAllowedNextReservationStatuses("CHECKED_IN")).toEqual(["CHECKED_OUT"]);
  });

  it("status terminais não têm próximas transições", () => {
    expect(getAllowedNextReservationStatuses("CHECKED_OUT")).toEqual([]);
    expect(getAllowedNextReservationStatuses("CANCELLED")).toEqual([]);
    expect(getAllowedNextReservationStatuses("NO_SHOW")).toEqual([]);
  });
});

describe("canTransitionReservationStatus", () => {
  it("permite transições válidas", () => {
    expect(canTransitionReservationStatus("PRE_RESERVED", "CONFIRMED")).toBe(true);
    expect(canTransitionReservationStatus("CONFIRMED", "CHECKED_IN")).toBe(true);
    expect(canTransitionReservationStatus("CHECKED_IN", "CHECKED_OUT")).toBe(true);
  });

  it("bloqueia transições inválidas", () => {
    expect(canTransitionReservationStatus("PRE_RESERVED", "CHECKED_IN")).toBe(false);
    expect(canTransitionReservationStatus("CHECKED_OUT", "CHECKED_IN")).toBe(false);
    expect(canTransitionReservationStatus("CANCELLED", "CONFIRMED")).toBe(false);
  });
});

describe("isReservationOccupying", () => {
  it("identifica statuses que ocupam o quarto", () => {
    expect(isReservationOccupying("PRE_RESERVED")).toBe(true);
    expect(isReservationOccupying("CONFIRMED")).toBe(true);
    expect(isReservationOccupying("CHECKED_IN")).toBe(true);
  });

  it("identifica statuses que não ocupam o quarto", () => {
    expect(isReservationOccupying("CHECKED_OUT")).toBe(false);
    expect(isReservationOccupying("CANCELLED")).toBe(false);
    expect(isReservationOccupying("NO_SHOW")).toBe(false);
  });
});

describe("isReservationTerminal", () => {
  it("identifica statuses terminais", () => {
    expect(isReservationTerminal("CHECKED_OUT")).toBe(true);
    expect(isReservationTerminal("CANCELLED")).toBe(true);
    expect(isReservationTerminal("NO_SHOW")).toBe(true);
  });

  it("identifica statuses não-terminais", () => {
    expect(isReservationTerminal("PRE_RESERVED")).toBe(false);
    expect(isReservationTerminal("CONFIRMED")).toBe(false);
    expect(isReservationTerminal("CHECKED_IN")).toBe(false);
  });
});
