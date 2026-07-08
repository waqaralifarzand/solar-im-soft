import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

export interface TenantContext {
  companyId: string;
  userId: string;
  role: Role;
}

/**
 * Server-only helper. Every server action / route handler that touches tenant data
 * must go through this instead of trusting a companyId sent from the client.
 * Throws away from the request if there's no session, or if the session has no
 * company (e.g. a SUPER_ADMIN, which has no tenant context).
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const { userId, role, companyId } = session.user;
  if (!companyId) {
    throw new Error("getTenantContext() called for a session with no company (SUPER_ADMIN?)");
  }
  return { companyId, userId, role };
}
