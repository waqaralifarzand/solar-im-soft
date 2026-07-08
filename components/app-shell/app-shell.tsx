import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import type { Role } from "@prisma/client";

interface AppShellProps {
  children: React.ReactNode;
  companyName: string;
  logoUrl: string | null;
  userName: string;
  role: Role;
}

export function AppShell({ children, companyName, logoUrl, userName, role }: AppShellProps) {
  return (
    <div className="flex h-full">
      <Sidebar
        role={role}
        companyName={companyName}
        logoUrl={logoUrl}
        userName={userName}
        userRole={role}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-8">{children}</main>
      </div>
    </div>
  );
}
