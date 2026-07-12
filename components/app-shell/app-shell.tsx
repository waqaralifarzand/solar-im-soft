import { Suspense } from "react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { RouteProgress } from "@/components/app-shell/route-progress";
import type { Role } from "@prisma/client";

interface AppShellProps {
  children: React.ReactNode;
  companyName: string;
  hasLogo: boolean;
  userName: string;
  role: Role;
  isImpersonating?: boolean;
}

export function AppShell({
  children,
  companyName,
  hasLogo,
  userName,
  role,
  isImpersonating = false,
}: AppShellProps) {
  return (
    <div className="flex h-full">
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <Sidebar
        role={role}
        companyName={companyName}
        hasLogo={hasLogo}
        userName={userName}
        userRole={role}
        isImpersonating={isImpersonating}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <Topbar role={role} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-background p-8">{children}</main>
      </div>
    </div>
  );
}
