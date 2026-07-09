import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getSalesReport } from "@/lib/queries/reports";
import { parseReportDateRange } from "@/lib/reportDateRange";
import { SalesReportView } from "@/components/reports/sales-report-view";

export const dynamic = "force-dynamic";

export default async function SalesReportPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const ctx = await getTenantContext();
  const { from, to } = parseReportDateRange(searchParams.from, searchParams.to);

  const [report, company] = await Promise.all([
    getSalesReport(ctx.companyId, from, to),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return <SalesReportView report={report} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />;
}
