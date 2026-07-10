import type { Role } from "@prisma/client";
import { CommandPalette } from "@/components/command-palette/command-palette";

export function Topbar({ role }: { role: Role }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
      <div />
      <CommandPalette role={role} />
    </header>
  );
}
