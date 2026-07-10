import { prisma } from "@/lib/prisma";

export interface CompanyAuditLogRow {
  id: string;
  createdAt: Date;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  actorName: string;
  actorEmail: string;
}

/**
 * Company-scoped audit trail for the Settings > Audit log tab. Deliberately a separate,
 * small query from lib/queries/super-admin.ts's listAuditLogs — that one is super-admin-only
 * code (global, cross-tenant) and this one is company-admin-only code (single tenant); kept
 * isolated rather than sharing an import across that security boundary.
 */
export async function listCompanyAuditLogs(companyId: string, limit = 200): Promise<CompanyAuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const userById = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    meta: r.meta,
    actorName: userById.get(r.userId)?.name ?? "Unknown",
    actorEmail: userById.get(r.userId)?.email ?? "",
  }));
}
