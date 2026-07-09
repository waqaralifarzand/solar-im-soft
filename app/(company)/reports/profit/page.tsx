import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getProfitReport } from "@/lib/queries/reports";
import { parseReportDateRange } from "@/lib/reportDateRange";
import { ProfitReportView } from "@/components/reports/profit-report-view";

export const dynamic = "force-dynamic";

export default async function ProfitReportPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const ctx = await getTenantContext();
  const { from, to } = parseReportDateRange(searchParams.from, searchParams.to);

  const [report, company] = await Promise.all([
    getProfitReport(ctx.companyId, from, to),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return <ProfitReportView report={report} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />;
}
