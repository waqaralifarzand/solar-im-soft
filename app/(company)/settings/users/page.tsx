import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { CompanyUsersTable } from "@/components/settings/company-users-table";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const ctx = await getTenantContext();
  const users = await prisma.user.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <CreateUserForm />
      <CompanyUsersTable users={users} currentUserId={ctx.userId} />
    </div>
  );
}
