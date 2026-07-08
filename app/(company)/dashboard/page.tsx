import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true } });
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
        Good day, {firstName}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dashboard widgets land in a later phase.
      </p>
    </div>
  );
}
