"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  accessRequestSchema,
  loginSchema,
  type AccessRequestInput,
  type LoginInput,
} from "@/lib/validations/auth";
import type { Role, UserProfile } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function login(
  input: LoginInput,
  redirectTo = "/dashboard",
): Promise<ActionResult<{ redirectTo: string }>> {
  const ip = await getRequestIp();
  const rateLimitKey = `login:${ip}`;
  if (!rateLimit(rateLimitKey, 5, 0.1)) {
    return {
      success: false,
      error: "Muitas tentativas de login. Por favor, tente novamente mais tarde.",
    };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Revise os dados de acesso.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { success: false, error: "E-mail ou senha inválidos." };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { authUserId: data.user.id },
    select: { id: true, status: true, isActive: true },
  });

  if (!profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Não encontramos seu perfil interno. Procure a administração.",
    };
  }

  const accessResult = await resolveLoginAccess(profile, supabase);
  if (accessResult) return accessResult;

  await prisma.userProfile.update({
    where: { id: profile.id },
    data: { lastLoginAt: new Date() },
  });

  return { success: true, data: { redirectTo: normalizeRedirect(redirectTo) } };
}

export async function logout(): Promise<ActionResult<{ redirectTo: string }>> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true, data: { redirectTo: "/login" } };
}

export async function requestAccess(
  input: AccessRequestInput,
): Promise<ActionResult<{ redirectTo: string }>> {
  const ip = await getRequestIp();
  const rateLimitKey = `requestAccess:${ip}`;
  if (!rateLimit(rateLimitKey, 3, 0.017)) {
    return {
      success: false,
      error: "Muitas solicitações de acesso. Por favor, tente novamente mais tarde.",
    };
  }

  const parsed = accessRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Revise os dados da solicitação.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const existingProfile = await prisma.userProfile.findUnique({ where: { email } });
  const existingResult = resolveExistingAccessRequest(existingProfile);

  if (existingResult) return existingResult;

  const authUserId = await resolveAccessAuthUserId(
    existingProfile?.authUserId,
    data,
    email,
  );
  if (!authUserId) {
    return accessCreationError();
  }

  const profile = await prisma.userProfile.upsert({
    where: { authUserId },
    update: {
      name: data.name,
      email,
      phone: normalizeOptional(data.phone),
      role: "UNASSIGNED",
      requestedRole: data.requestedRole as Role,
      requestMessage: normalizeOptional(data.requestMessage),
      status: "PENDING",
      isActive: false,
      rejectedAt: null,
      rejectedById: null,
      rejectionReason: null,
    },
    create: {
      authUserId,
      name: data.name,
      email,
      phone: normalizeOptional(data.phone),
      role: "UNASSIGNED",
      requestedRole: data.requestedRole as Role,
      requestMessage: normalizeOptional(data.requestMessage),
      status: "PENDING",
      isActive: false,
    },
  });

  await logAudit({
    action: "ACCESS_REQUESTED",
    entity: "UserProfile",
    entityId: profile.id,
    afterData: {
      name: profile.name,
      email: profile.email,
      requestedRole: profile.requestedRole,
      status: profile.status,
    },
  });

  return { success: true, data: { redirectTo: "/aguardando-aprovacao" } };
}

async function resolveLoginAccess(
  profile: Pick<UserProfile, "status" | "isActive">,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ActionResult<{ redirectTo: string }> | null> {
  const blockMessage = getLoginBlockMessage(profile);

  if (profile.status === "PENDING") {
    return { success: true, data: { redirectTo: "/aguardando-aprovacao" } };
  }
  if (!blockMessage) return null;

  await supabase.auth.signOut();
  return { success: false, error: blockMessage };
}

function getLoginBlockMessage(
  profile: Pick<UserProfile, "status" | "isActive">,
): string | null {
  if (profile.status === "REJECTED") {
    return "Sua solicitação foi rejeitada. Procure a administração.";
  }
  if (profile.status === "BLOCKED") {
    return "Sua conta está bloqueada. Procure a administração.";
  }
  if (profile.status === "INACTIVE" || !profile.isActive) {
    return "Sua conta está inativa. Procure a administração.";
  }
  return null;
}

function resolveExistingAccessRequest(
  profile: Pick<UserProfile, "status" | "isActive"> | null,
): ActionResult<{ redirectTo: string }> | null {
  if (profile?.status === "APPROVED" && profile.isActive) {
    return { success: true, data: { redirectTo: "/aguardando-aprovacao" } };
  }
  if (profile?.status === "PENDING") {
    return { success: true, data: { redirectTo: "/aguardando-aprovacao" } };
  }
  return null;
}

async function resolveAccessAuthUserId(
  currentAuthUserId: string | undefined,
  data: AccessRequestInput,
  email: string,
): Promise<string | null> {
  if (currentAuthUserId) return currentAuthUserId;

  try {
    const admin = createAdminClient();
    return await createAuthUser(admin, data.name, email, data.password);
  } catch (error) {
    await logAudit({
      action: "ACCESS_REQUEST_CREATE_FAILED",
      entity: "UserProfile",
      entityId: email,
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    return null;
  }
}

function accessCreationError(): ActionResult<{ redirectTo: string }> {
  return {
    success: false,
    error: "Não foi possível criar a solicitação agora. Procure a administração.",
  };
}

async function createAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  name: string,
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error || !data.user) {
    throw new Error("Não foi possível criar a credencial. Procure a administração.");
  }

  return data.user.id;
}

function normalizeOptional(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRedirect(value: string): string {
  // Must be an internal path that starts with a single forward slash followed
  // by a non-slash, non-backslash character. Rejects protocol-relative URLs
  // (//evil.com), backslash-prefixed paths some parsers treat as protocol
  // separators (/\evil.com), javascript: and data: URIs, and empty values.
  if (!/^\/[^/\\]/.test(value)) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/solicitar-acesso")) return "/dashboard";
  return value;
}
