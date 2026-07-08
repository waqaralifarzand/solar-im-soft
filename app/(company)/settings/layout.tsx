import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/getTenantContext";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
