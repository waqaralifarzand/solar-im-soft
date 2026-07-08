"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn } from "lucide-react";
import { resetUserPassword, startImpersonation } from "@/lib/actions/super-admin";
import { RevealPasswordDialog } from "@/components/super/reveal-password-dialog";

export function UserRowActions({
  companyId,
  userId,
  role,
}: {
  companyId: string;
  userId: string;
  role: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; tempPassword: string } | null>(null);

  function handleResetPassword() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetUserPassword(userId);
        setRevealed(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleImpersonate() {
    setError(null);
    startTransition(async () => {
      try {
        await startImpersonation(companyId, userId);
        router.push("/dashboard");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-2 text-xs text-destructive">{error}</span>}
      <button
        type="button"
        onClick={handleResetPassword}
        disabled={isPending}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title="Reset password"
      >
        <KeyRound size={15} />
      </button>
      {role === "ADMIN" && (
        <button
          type="button"
          onClick={handleImpersonate}
          disabled={isPending}
          className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
          title="Login as"
        >
          <LogIn size={15} />
        </button>
      )}

      <RevealPasswordDialog
        open={!!revealed}
        onOpenChange={(open) => !open && setRevealed(null)}
        email={revealed?.email ?? ""}
        tempPassword={revealed?.tempPassword ?? ""}
      />
    </div>
  );
}
