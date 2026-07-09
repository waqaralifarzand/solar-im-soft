import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTenantContext } from "@/lib/getTenantContext";
import { getSupplierDetail } from "@/lib/queries/customers";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const supplier = await getSupplierDetail(ctx.companyId, params.id);

  if (!supplier) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/suppliers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Back to suppliers
        </Link>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">{supplier.name}</h1>
      </div>

      <SupplierForm
        mode="edit"
        supplierId={supplier.id}
        initialValues={{
          name: supplier.name,
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
        }}
      />
    </div>
  );
}
