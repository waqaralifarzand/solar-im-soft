import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getCustomerDues } from "@/lib/queries/reports";
import { CustomerDuesView } from "@/components/reports/customer-dues-view";

export const dynamic = "force-dynamic";

export default async function CustomerDuesPage() {
  const ctx = await getTenantContext();

  const [report, company] = await Promise.all([
    getCustomerDues(ctx.companyId),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return <CustomerDuesView report={report} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />;
}
