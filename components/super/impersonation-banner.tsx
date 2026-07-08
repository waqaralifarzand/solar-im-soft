"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { exitImpersonation } from "@/lib/actions/super-admin";

export function ImpersonationBanner({ companyName }: { companyName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      await exitImpersonation();
      // Deliberately no router.refresh(): that would re-render this still-mounted
      // /dashboard page as a plain SUPER_ADMIN (no impersonation cookie anymore),
      // which getTenantContext() rejects. router.push alone navigates away first.
      router.push("/super");
    });
  }

  return (
    <div className="flex h-10 items-center justify-center gap-3 bg-foreground px-4 text-sm text-white">
      <span>
        Viewing as <span className="font-medium">{companyName}</span>
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={isPending}
        className="rounded-pill bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 disabled:opacity-50"
      >
        Exit
      </button>
    </div>
  );
}
