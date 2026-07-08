import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { IMPERSONATION_COOKIE_NAME, verifyImpersonationToken } from "@/lib/impersonation";

export interface TenantContext {
  companyId: string;
  userId: string;
  role: Role;
  /** Set only while a SUPER_ADMIN is impersonating — the real actor for audit purposes. */
  impersonatedBy?: string;
}

/**
 * Server-only helper. Every server action / route handler that touches tenant data
 * must go through this instead of trusting a companyId sent from the client.
 * Redirects away if there's no session, or if a SUPER_ADMIN hits it while not
 * impersonating — that's an expected transient state right after exiting
 * impersonation, since Next.js auto-refreshes the current route after any
 * Server Action resolves, which can re-render this layout for a beat before
 * the client-side navigation away from it lands.
 *
 * While a SUPER_ADMIN is impersonating (see lib/impersonation.ts), this returns the
 * impersonated company/user/role instead — callers that write AuditLog rows must use
 * `impersonatedBy` (the real super admin's id) as the actor, per ARCHITECTURE.md §2.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "SUPER_ADMIN") {
    const token = cookies().get(IMPERSONATION_COOKIE_NAME)?.value;
    const impersonation = await verifyImpersonationToken(token);
    if (!impersonation) {
      redirect("/super");
    }
    return {
      companyId: impersonation.companyId,
      userId: impersonation.targetUserId,
      role: impersonation.targetRole,
      impersonatedBy: impersonation.actualSuperAdminId,
    };
  }

  const { userId, role, companyId } = session.user;
  if (!companyId) {
    throw new Error("getTenantContext() called for a session with no company");
  }
  return { companyId, userId, role };
}
