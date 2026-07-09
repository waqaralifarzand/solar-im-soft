import { getTenantContext } from "@/lib/getTenantContext";
import { listSuppliers } from "@/lib/queries/suppliers";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { CreateSupplierForm } from "@/components/suppliers/create-supplier-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const ctx = await getTenantContext();
  const suppliers = await listSuppliers(ctx.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Suppliers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your suppliers.</p>
      </div>
      <CreateSupplierForm />
      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
