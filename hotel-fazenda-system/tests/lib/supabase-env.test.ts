import { describe, expect, it } from "vitest";
import { assertPublicAnonKey } from "@/lib/supabase/env";

describe("assertPublicAnonKey", () => {
  it("accepts publishable Supabase keys", () => {
    expect(() => assertPublicAnonKey("sb_publishable_example")).not.toThrow();
  });

  it("rejects secret-format Supabase keys in public env", () => {
    expect(() => assertPublicAnonKey("sb_secret_example")).toThrow(/anon\/publishable/);
  });

  it("rejects service_role JWTs in public env", () => {
    expect(() => assertPublicAnonKey(createJwtWithRole("service_role"))).toThrow(/service_role/);
  });
});

function createJwtWithRole(role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}
