import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Server-only guard: throws unless the current session is a real (non-impersonated) SUPER_ADMIN. */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: super admin only");
  }
  return session.user;
}
