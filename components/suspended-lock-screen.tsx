import { Lock } from "lucide-react";

export function SuspendedLockScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-card bg-surface">
          <Lock className="text-muted-foreground" size={28} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">
            Account suspended
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact your provider to reactivate this account.
          </p>
        </div>
      </div>
    </main>
  );
}
