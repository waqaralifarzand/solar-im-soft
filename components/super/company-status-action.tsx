"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suspendCompany, activateCompany } from "@/lib/actions/super-admin";
import { Button } from "@/components/ui/button";

export function CompanyStatusAction({
  companyId,
  companyName,
  status,
}: {
  companyId: string;
  companyName: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (status === "ACTIVE" && !confirm(`Suspend ${companyName}? Its users will be locked out immediately.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (status === "ACTIVE") {
          await suspendCompany(companyId);
        } else {
          await activateCompany(companyId);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button variant={status === "ACTIVE" ? "destructive" : "primary"} size="sm" onClick={handleClick} disabled={isPending}>
        {status === "ACTIVE" ? "Suspend company" : "Activate company"}
      </Button>
    </div>
  );
}
