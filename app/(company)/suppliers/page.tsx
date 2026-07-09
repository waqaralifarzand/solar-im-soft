import Link from "next/link";
import { getTenantContext } from "@/lib/getTenantContext";
import { listSuppliersForCompany } from "@/lib/queries/customers";
import { Button } from "@/components/ui/button";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const ctx = await getTenantContext();
  const suppliers = await listSuppliersForCompany(ctx.companyId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/suppliers/new">
          <Button>New supplier</Button>
        </Link>
      </div>

      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
