import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name merger)", () => {
  it("concatena classes simples", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("remove conflitos de Tailwind (resolve a última)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignora valores falsy", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
});
