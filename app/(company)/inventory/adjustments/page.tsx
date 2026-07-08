import { getTenantContext } from "@/lib/getTenantContext";
import { listAllAdjustments } from "@/lib/queries/inventory";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { AdjustmentsTable } from "@/components/inventory/adjustments-table";

export const dynamic = "force-dynamic";

export default async function AdjustmentsPage() {
  const ctx = await getTenantContext();
  const adjustments = await listAllAdjustments(ctx.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">Categories, products, and stock adjustments.</p>
      </div>
      <InventoryTabs />
      <AdjustmentsTable adjustments={adjustments} />
    </div>
  );
}
