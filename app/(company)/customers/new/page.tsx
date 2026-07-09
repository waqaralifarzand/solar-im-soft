import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantContext } from "@/lib/getTenantContext";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await getTenantContext();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
          Back to customers
        </Link>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New customer</h1>
      </div>

      <CustomerForm mode="create" />
    </div>
  );
}
