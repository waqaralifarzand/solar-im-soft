import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { listProductsForSale, listCustomersForPicker } from "@/lib/queries/invoices";
import { PosScreen } from "@/components/pos/pos-screen";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const ctx = await getTenantContext();
  const [products, customers, company] = await Promise.all([
    listProductsForSale(ctx.companyId),
    listCustomersForPicker(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { name: true, taxRate: true, currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Point of sale</h1>
      </div>
      <PosScreen
        companyName={company.name}
        products={products}
        customers={customers}
        taxRate={company.taxRate.toString()}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
