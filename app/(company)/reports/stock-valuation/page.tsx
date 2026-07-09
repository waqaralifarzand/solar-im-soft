import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getStockValuation } from "@/lib/queries/reports";
import { StockValuationView } from "@/components/reports/stock-valuation-view";

export const dynamic = "force-dynamic";

export default async function StockValuationPage() {
  const ctx = await getTenantContext();

  const [report, company] = await Promise.all([
    getStockValuation(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return <StockValuationView report={report} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />;
}
