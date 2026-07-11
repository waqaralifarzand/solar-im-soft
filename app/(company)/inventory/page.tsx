import Link from "next/link";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { listProductsForCompany, listCategories } from "@/lib/queries/inventory";
import { InventoryTabs } from "@/components/inventory/inventory-tabs";
import { ProductsTable } from "@/components/inventory/products-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const ctx = await getTenantContext();
  const [products, categories, company] = await Promise.all([
    listProductsForCompany(ctx.companyId),
    listCategories(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Categories, products, and stock adjustments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/import">
            <Button size="page" variant="secondary">
              Import
            </Button>
          </Link>
          <Link href="/inventory/new">
            <Button size="page">New product</Button>
          </Link>
        </div>
      </div>
      <InventoryTabs />
      <ProductsTable
        products={products}
        categories={categories}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
