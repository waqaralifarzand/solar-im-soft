import Link from "next/link";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listQuotations } from "@/lib/queries/quotations";
import { QuotationsTable } from "@/components/quotations/quotations-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const ctx = await requireRole("ADMIN", "MANAGER");
  const [quotations, company] = await Promise.all([
    listQuotations(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Quotations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and track customer quotes.</p>
        </div>
        <Link href="/quotations/new">
          <Button size="page">New quotation</Button>
        </Link>
      </div>
      <QuotationsTable quotations={quotations} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />
    </div>
  );
}
