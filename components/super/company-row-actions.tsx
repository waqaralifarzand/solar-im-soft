"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, KeyRound, LogIn } from "lucide-react";
import { suspendCompany, activateCompany, resetUserPassword, startImpersonation } from "@/lib/actions/super-admin";
import { RevealPasswordDialog } from "@/components/super/reveal-password-dialog";
import type { CompanyListRow } from "@/lib/queries/super-admin";

export function CompanyRowActions({ company }: { company: CompanyListRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; tempPassword: string } | null>(null);

  function handleToggleStatus() {
    if (company.status === "ACTIVE" && !confirm(`Suspend ${company.name}? Its users will be locked out immediately.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (company.status === "ACTIVE") {
          await suspendCompany(company.id);
        } else {
          await activateCompany(company.id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleResetPassword() {
    if (!company.primaryAdminId) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetUserPassword(company.primaryAdminId!);
        setRevealed(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleImpersonate() {
    if (!company.primaryAdminId) return;
    setError(null);
    startTransition(async () => {
      try {
        await startImpersonation(company.id, company.primaryAdminId!);
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
        onClick={handleToggleStatus}
        disabled={isPending}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title={company.status === "ACTIVE" ? "Suspend" : "Activate"}
      >
        {company.status === "ACTIVE" ? <Ban size={15} /> : <CheckCircle2 size={15} />}
      </button>
      <button
        type="button"
        onClick={handleResetPassword}
        disabled={isPending || !company.primaryAdminId}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title="Reset admin password"
      >
        <KeyRound size={15} />
      </button>
      <button
        type="button"
        onClick={handleImpersonate}
        disabled={isPending || !company.primaryAdminId}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title="Login as admin"
      >
        <LogIn size={15} />
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
