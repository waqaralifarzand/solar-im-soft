"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSupplier } from "@/lib/actions/customers";

export function SupplierRowActions({ supplierId, name }: { supplierId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteSupplier(supplierId);
        router.refresh();
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
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title="Delete"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
