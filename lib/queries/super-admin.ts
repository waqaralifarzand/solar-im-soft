import { prisma } from "@/lib/prisma";

/**
 * "Last activity" for a company = the most recent of: any user's lastLoginAt, any
 * AuditLog row for that company, falling back to the company's own createdAt.
 * Computed with two grouped queries instead of per-company round trips.
 */
async function computeLastActivity(companyIds: string[]): Promise<Record<string, Date>> {
  if (companyIds.length === 0) return {};

  const [userLogins, auditLogs] = await Promise.all([
    prisma.user.groupBy({
      by: ["companyId"],
      _max: { lastLoginAt: true },
      where: { companyId: { in: companyIds } },
    }),
    prisma.auditLog.groupBy({
      by: ["companyId"],
      _max: { createdAt: true },
      where: { companyId: { in: companyIds } },
    }),
  ]);

  const map: Record<string, Date> = {};
  for (const row of userLogins) {
    if (row.companyId && row._max.lastLoginAt) map[row.companyId] = row._max.lastLoginAt;
  }
  for (const row of auditLogs) {
    if (!row.companyId || !row._max.createdAt) continue;
    const existing = map[row.companyId];
    if (!existing || row._max.createdAt > existing) map[row.companyId] = row._max.createdAt;
  }
  return map;
}

export interface CompanyListRow {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  usersCount: number;
  invoicesCount: number;
  lastActivity: Date;
  /** First ADMIN user created for this company — target for row-level reset/login-as actions. */
  primaryAdminId: string | null;
}

export async function listCompaniesWithStats(): Promise<CompanyListRow[]> {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, invoices: true } },
      users: { where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
    },
  });
  const activity = await computeLastActivity(companies.map((c) => c.id));

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status,
    usersCount: c._count.users,
    invoicesCount: c._count.invoices,
    lastActivity: activity[c.id] ?? c.createdAt,
    primaryAdminId: c.users[0]?.id ?? null,
  }));
}

export interface OverviewStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  signupsThisMonth: number;
  mostActive: { id: string; name: string; lastActivity: Date }[];
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalCompanies, statusGroups, signupsThisMonth, companies] = await Promise.all([
    prisma.company.count(),
    prisma.company.groupBy({ by: ["status"], _count: true }),
    prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.company.findMany({ select: { id: true, name: true, createdAt: true } }),
  ]);

  const activity = await computeLastActivity(companies.map((c) => c.id));
  const mostActive = companies
    .map((c) => ({ id: c.id, name: c.name, lastActivity: activity[c.id] ?? c.createdAt }))
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .slice(0, 5);

  return {
    totalCompanies,
    activeCompanies: statusGroups.find((g) => g.status === "ACTIVE")?._count ?? 0,
    suspendedCompanies: statusGroups.find((g) => g.status === "SUSPENDED")?._count ?? 0,
    signupsThisMonth,
    mostActive,
  };
}

export async function getCompanyDetail(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { users: true, invoices: true } },
    },
  });
  if (!company) return null;

  const activity = await computeLastActivity([companyId]);
  const auditTrail = await prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const actorIds = [...new Set(auditTrail.map((a) => a.userId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return {
    company,
    usersCount: company._count.users,
    invoicesCount: company._count.invoices,
    lastActivity: activity[companyId] ?? company.createdAt,
    auditTrail: auditTrail.map((a) => ({ ...a, actor: actorById.get(a.userId) ?? null })),
  };
}

export interface AuditLogRow {
  id: string;
  createdAt: Date;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  companyName: string | null;
  actorName: string;
  actorEmail: string;
}

export async function listAuditLogs(limit = 200): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const companyIds = [...new Set(rows.map((r) => r.companyId).filter((id): id is string => !!id))];
  const userIds = [...new Set(rows.map((r) => r.userId))];

  const [companies, users] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
  ]);
  const companyById = new Map(companies.map((c) => [c.id, c.name]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    meta: r.meta,
    companyName: r.companyId ? (companyById.get(r.companyId) ?? null) : null,
    actorName: userById.get(r.userId)?.name ?? "Unknown",
    actorEmail: userById.get(r.userId)?.email ?? "",
  }));
}
