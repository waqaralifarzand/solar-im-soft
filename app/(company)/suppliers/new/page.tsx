import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantContext } from "@/lib/getTenantContext";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  await getTenantContext();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/suppliers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Back to suppliers
        </Link>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New supplier</h1>
      </div>

      <SupplierForm mode="create" />
    </div>
  );
}
