import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listProductsForCompany } from "@/lib/queries/inventory";
import { listSuppliers } from "@/lib/queries/suppliers";
import { PurchaseOrderForm } from "@/components/purchases/purchase-order-form";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [products, suppliers, company] = await Promise.all([
    listProductsForCompany(ctx.companyId),
    listSuppliers(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New purchase order</h1>
        <p className="mt-1 text-sm text-muted-foreground">Order stock from a supplier.</p>
      </div>
      <PurchaseOrderForm
        products={products}
        suppliers={suppliers}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
