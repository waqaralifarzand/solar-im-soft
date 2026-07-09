import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getTopProducts } from "@/lib/queries/reports";
import { parseReportDateRange } from "@/lib/reportDateRange";
import { TopProductsView } from "@/components/reports/top-products-view";

export const dynamic = "force-dynamic";

export default async function TopProductsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const ctx = await getTenantContext();
  const { from, to } = parseReportDateRange(searchParams.from, searchParams.to);

  const [rows, company] = await Promise.all([
    getTopProducts(ctx.companyId, from, to),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return <TopProductsView rows={rows} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />;
}
