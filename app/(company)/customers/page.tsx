import Link from "next/link";
import { getTenantContext } from "@/lib/getTenantContext";
import { listCustomersForCompany } from "@/lib/queries/customers";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { CustomersTable } from "@/components/customers/customers-table";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const ctx = await getTenantContext();
  const [customers, company] = await Promise.all([
    listCustomersForCompany(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/customers/new">
          <Button>New customer</Button>
        </Link>
      </div>

      <CustomersTable
        customers={customers}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
