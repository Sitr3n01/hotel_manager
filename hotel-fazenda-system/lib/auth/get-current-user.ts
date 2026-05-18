import "server-only";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";
import type { UserProfile as PrismaUserProfile } from "@prisma/client";
import { normalizePermissionKeys, type PermissionKey } from "@/lib/auth/permissions";

export type CurrentUser = PrismaUserProfile & {
  permissions: PermissionKey[];
};

export type CurrentAuthContext = {
  authUser: User | null;
  profile: CurrentUser | null;
};

type ProfileWithPermissions = PrismaUserProfile & {
  permissionTags: {
    isActive: boolean;
    permissionTag: {
      key: string;
      isActive: boolean;
    };
  }[];
};

export async function getCurrentAuthContext(): Promise<CurrentAuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authUser: null, profile: null };

  const profile = await prisma.userProfile.findUnique({
    where: { authUserId: user.id },
    include: {
      permissionTags: {
        where: { isActive: true, permissionTag: { isActive: true } },
        include: { permissionTag: { select: { key: true, isActive: true } } },
      },
    },
  });

  return { authUser: user, profile: profile ? toCurrentUser(profile) : null };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { profile } = await getCurrentAuthContext();

  if (!profile || profile.status !== "APPROVED" || !profile.isActive) return null;

  return profile;
}

function toCurrentUser(profile: ProfileWithPermissions): CurrentUser {
  const permissions = normalizePermissionKeys(
    profile.permissionTags.map((entry) => entry.permissionTag.key),
  );
  const { permissionTags: _permissionTags, ...userProfile } = profile;
  return { ...userProfile, permissions };
}
