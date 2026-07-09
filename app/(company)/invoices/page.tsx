import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listInvoices } from "@/lib/queries/invoices";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [invoices, company] = await Promise.all([
    listInvoices(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">All sales — POS and standard invoices.</p>
        </div>
        <Link href="/invoices/new">
          <Button size="page">New invoice</Button>
        </Link>
      </div>
      <InvoicesTable invoices={invoices} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />
    </div>
  );
}
