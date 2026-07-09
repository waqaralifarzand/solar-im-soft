import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listProductsForSale, listCustomersForPicker } from "@/lib/queries/invoices";
import { QuotationForm } from "@/components/quotations/quotation-form";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [products, customers, company] = await Promise.all([
    listProductsForSale(ctx.companyId),
    listCustomersForPicker(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { taxRate: true, currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New quotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a quote for a saved or free-text customer.</p>
      </div>
      <QuotationForm
        products={products}
        customers={customers}
        taxRate={company.taxRate.toString()}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
