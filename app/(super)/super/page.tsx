import Link from "next/link";
import { getOverviewStats } from "@/lib/queries/super-admin";
import { StatCard } from "@/components/super/stat-card";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  const stats = await getOverviewStats();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Company accounts across the platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total companies" value={stats.totalCompanies} />
        <StatCard label="Active" value={stats.activeCompanies} />
        <StatCard label="Suspended" value={stats.suspendedCompanies} />
        <StatCard label="Signups this month" value={stats.signupsThisMonth} />
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Most recently active companies</h2>
        <Card className="mt-3 p-0">
          {stats.mostActive.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No companies yet.</p>
          ) : (
            <ul>
              {stats.mostActive.map((c, i) => (
                <li
                  key={c.id}
                  className={i > 0 ? "border-t border-border" : ""}
                >
                  <Link
                    href={`/super/companies/${c.id}`}
                    className="flex items-center justify-between px-6 py-3 text-sm hover:bg-surface"
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.lastActivity.toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
