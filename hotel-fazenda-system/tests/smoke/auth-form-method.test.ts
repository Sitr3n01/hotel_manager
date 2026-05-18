import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const AUTH_FORMS = [
  "app/(auth)/login/page.tsx",
  "app/(auth)/solicitar-acesso/page.tsx",
];

describe("auth form transport", () => {
  it.each(AUTH_FORMS)("usa POST em %s para não expor credenciais na URL", (file) => {
    const source = readFileSync(file, "utf8");

    expect(source).toContain('<form method="post"');
  });
});
