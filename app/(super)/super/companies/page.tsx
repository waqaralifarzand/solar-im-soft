import Link from "next/link";
import { listCompaniesWithStats } from "@/lib/queries/super-admin";
import { CompaniesTable } from "@/components/super/companies-table";
import { Button } from "@/components/ui/button";

export default async function CompaniesPage() {
  const companies = await listCompaniesWithStats();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every tenant on this deployment.</p>
        </div>
        <Link href="/super/companies/new">
          <Button size="page">New company</Button>
        </Link>
      </div>

      <CompaniesTable companies={companies} />
    </div>
  );
}
