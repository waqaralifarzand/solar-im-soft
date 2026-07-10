import { getTenantContext } from "@/lib/getTenantContext";
import { listCompanyAuditLogs } from "@/lib/queries/audit";
import { AuditLogTable } from "@/components/settings/audit-log-table";

export const dynamic = "force-dynamic";

export default async function AuditLogSettingsPage() {
  const ctx = await getTenantContext();
  const logs = await listCompanyAuditLogs(ctx.companyId);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Latest {logs.length} actions across your company.</p>
      <AuditLogTable logs={logs} />
    </div>
  );
}
