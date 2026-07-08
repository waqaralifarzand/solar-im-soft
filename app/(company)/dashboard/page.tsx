import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const name = session?.user.name?.split(" ")[0] ?? "";

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-foreground">
        Good day, {name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dashboard widgets land in a later phase.
      </p>
    </div>
  );
}
