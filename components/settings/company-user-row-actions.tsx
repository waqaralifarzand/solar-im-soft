"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, KeyRound } from "lucide-react";
import { setCompanyUserStatus, resetCompanyUserPassword } from "@/lib/actions/settings-users";
import { RevealPasswordDialog } from "@/components/ui/reveal-password-dialog";
import { useToast } from "@/components/ui/toast";

interface CompanyUserRowActionsProps {
  userId: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  isSelf: boolean;
}

export function CompanyUserRowActions({ userId, email, status, isSelf }: CompanyUserRowActionsProps) {
  const router = useRouter();
  const showToast = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; tempPassword: string } | null>(null);

  function handleToggleStatus() {
    if (status === "ACTIVE" && !confirm(`Disable ${email}? They won't be able to log in.`)) return;
    setError(null);
    const next = status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    startTransition(async () => {
      try {
        await setCompanyUserStatus(userId, next);
        showToast(next === "ACTIVE" ? `${email} enabled` : `${email} disabled`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleResetPassword() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetCompanyUserPassword(userId);
        setRevealed(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-2 text-xs text-destructive">{error}</span>}
      {!isSelf && (
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isPending}
          className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
          title={status === "ACTIVE" ? "Disable" : "Enable"}
        >
          {status === "ACTIVE" ? <Ban size={15} /> : <CheckCircle2 size={15} />}
        </button>
      )}
      <button
        type="button"
        onClick={handleResetPassword}
        disabled={isPending}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title="Reset password"
      >
        <KeyRound size={15} />
      </button>

      <RevealPasswordDialog
        open={!!revealed}
        onOpenChange={(open) => !open && setRevealed(null)}
        email={revealed?.email ?? ""}
        tempPassword={revealed?.tempPassword ?? ""}
      />
    </div>
  );
}
