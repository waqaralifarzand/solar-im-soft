import { listAuditLogs } from "@/lib/queries/super-admin";
import { AuditTable } from "@/components/super/audit-table";

export default async function AuditLogPage() {
  const logs = await listAuditLogs();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Latest {logs.length} actions across every company.</p>
      </div>
      <AuditTable logs={logs} />
    </div>
  );
}
