import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listProductsForSale, listCustomersForPicker } from "@/lib/queries/invoices";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
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
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">New invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a standard invoice.</p>
      </div>
      <InvoiceForm
        products={products}
        customers={customers}
        taxRate={company.taxRate.toString()}
        currency={company.currency}
        lakhCroreFormat={company.lakhCroreFormat}
      />
    </div>
  );
}
