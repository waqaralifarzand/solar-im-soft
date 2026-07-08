import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/lib/queries/super-admin";
import { StatCard } from "@/components/super/stat-card";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { CompanyStatusAction } from "@/components/super/company-status-action";
import { UsersTable } from "@/components/super/users-table";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const detail = await getCompanyDetail(params.id);
  if (!detail) notFound();
  const { company, usersCount, invoicesCount, lastActivity, auditTrail } = detail;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{company.name}</h1>
            <StatusChip variant={company.status === "ACTIVE" ? "success" : "neutral"}>
              {company.status}
            </StatusChip>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">/{company.slug}</p>
        </div>
        <CompanyStatusAction companyId={company.id} companyName={company.name} status={company.status} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Users" value={usersCount} />
        <StatCard label="Invoices" value={invoicesCount} />
        <StatCard label="Last activity" value={lastActivity.toLocaleDateString()} />
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Branding preview</h2>
        <Card className="mt-3 flex items-center gap-4">
          <div
            className="h-10 w-10 rounded-input border border-border"
            style={{ backgroundColor: company.accentColor }}
          />
          <div>
            <p className="text-sm font-medium text-foreground">{company.name}</p>
            <p className="text-xs text-muted-foreground">
              {company.currency} · tax {company.taxRate.toString()}% · accent {company.accentColor}
            </p>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Users</h2>
        <div className="mt-3">
          <UsersTable companyId={company.id} users={company.users} />
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Recent activity</h2>
        <Card className="mt-3 p-0">
          {auditTrail.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No audit activity yet.</p>
          ) : (
            <ul>
              {auditTrail.map((entry, i) => (
                <li key={entry.id} className={i > 0 ? "border-t border-border" : ""}>
                  <div className="flex items-center justify-between px-6 py-3 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{entry.action}</span>
                      <span className="ml-2 text-muted-foreground">by {entry.actor?.name ?? "Unknown"}</span>
                    </div>
                    <span className="text-muted-foreground">{entry.createdAt.toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
