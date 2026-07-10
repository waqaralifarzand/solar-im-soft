import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SuperNav } from "@/components/super/super-nav";
import { ToastProvider } from "@/components/ui/toast";

export const dynamic = "force-dynamic";

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <SuperNav />
        <main className="mx-auto max-w-6xl p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
