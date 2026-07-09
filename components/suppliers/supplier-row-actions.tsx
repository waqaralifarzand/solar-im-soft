"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteSupplier } from "@/lib/actions/suppliers";
import { EditSupplierDialog } from "@/components/suppliers/edit-supplier-dialog";

interface SupplierRowActionsProps {
  supplierId: string;
  name: string;
  phone: string;
  address: string;
}

export function SupplierRowActions({ supplierId, name, phone, address }: SupplierRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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
      <EditSupplierDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplierId={supplierId}
        initialValues={{ name, phone, address }}
      />
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        disabled={isPending}
        className="rounded-pill p-2 text-muted-foreground hover:bg-surface disabled:opacity-50"
        title="Edit"
      >
        <Pencil size={15} />
      </button>
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
