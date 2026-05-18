import "server-only";
import { redirect } from "next/navigation";
import { getCurrentAuthContext, type CurrentUser } from "./get-current-user";

export async function requireAuth(): Promise<CurrentUser> {
  const { authUser, profile } = await getCurrentAuthContext();

  if (!authUser) redirect("/login");
  if (!profile) redirect("/login?access=perfil-nao-encontrado");

  if (profile.status === "PENDING") {
    redirect("/aguardando-aprovacao");
  }
  if (profile.status === "REJECTED") {
    redirect("/login?access=rejeitado");
  }
  if (profile.status === "BLOCKED") {
    redirect("/login?access=bloqueado");
  }
  if (profile.status === "INACTIVE" || !profile.isActive) {
    redirect("/login?access=inativo");
  }

  return profile;
}
