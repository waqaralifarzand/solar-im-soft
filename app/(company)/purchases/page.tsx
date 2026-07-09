import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listPurchaseOrders } from "@/lib/queries/purchases";
import { PurchaseOrdersTable } from "@/components/purchases/purchase-orders-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [purchaseOrders, company] = await Promise.all([
    listPurchaseOrders(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Purchases</h1>
          <p className="mt-1 text-sm text-muted-foreground">Purchase orders and stock receiving.</p>
        </div>
        <Link href="/purchases/new">
          <Button size="page">New purchase order</Button>
        </Link>
      </div>
      <PurchaseOrdersTable
        purchaseOrders={purchaseOrders}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
