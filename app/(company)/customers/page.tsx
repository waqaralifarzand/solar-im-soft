import Link from "next/link";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { listCustomersWithBalance } from "@/lib/queries/customers";
import { CustomersTable } from "@/components/customers/customers-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const ctx = await getTenantContext();
  const [customers, company] = await Promise.all([
    listCustomersWithBalance(ctx.companyId),
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
          <p className="mt-1 text-sm text-muted-foreground">Manage customers and khata balances.</p>
        </div>
        <Link href="/customers/new">
          <Button size="page">New customer</Button>
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
