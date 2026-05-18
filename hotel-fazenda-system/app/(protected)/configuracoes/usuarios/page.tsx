import { UsersAdminClient } from "@/components/users/users-admin-client";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listUsersForAdmin } from "@/lib/queries/users";

export default async function UsuariosPage() {
  const currentUser = await requireAnyPermission(["USERS_READ", "ACCESS_USERS_ADMIN"]);
  const users = await listUsersForAdmin();
  return <UsersAdminClient users={users} currentUserId={currentUser.id} />;
}
