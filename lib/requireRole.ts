import type { Role } from "@prisma/client";
import { getTenantContext, type TenantContext } from "@/lib/getTenantContext";

/** Server-only guard: throws unless the current tenant context's role is one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!roles.includes(ctx.role)) {
    throw new Error("Forbidden");
  }
  return ctx;
}
