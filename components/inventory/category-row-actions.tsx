"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCategory } from "@/lib/actions/inventory";
import { EditCategoryDialog } from "@/components/inventory/edit-category-dialog";

interface CategoryRowActionsProps {
  categoryId: string;
  name: string;
  productCount: number;
}

export function CategoryRowActions({ categoryId, name, productCount }: CategoryRowActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const message =
      productCount > 0
        ? `Delete "${name}"? ${productCount} product(s) will become uncategorized.`
        : `Delete "${name}"?`;
    if (!confirm(message)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCategory(categoryId);
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
        onClick={() => setEditing(true)}
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

      <EditCategoryDialog categoryId={categoryId} initialName={name} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
