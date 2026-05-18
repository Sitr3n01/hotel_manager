type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }
  assertPublicAnonKey(anonKey);

  return { url, anonKey };
}

export function assertPublicAnonKey(value: string | undefined): asserts value is string {
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
  }
  if (value.startsWith("sb_secret_")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase anon/publishable key.");
  }
  if (getJwtRole(value) === "service_role") {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY cannot use a service_role JWT.");
  }
}

function getJwtRole(value: string): string | null {
  const [, payload] = value.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = globalThis.atob(padded);
    const parsed = JSON.parse(json) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}
