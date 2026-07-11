import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportWizard } from "@/components/inventory/import-wizard";

export default function ImportProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to inventory
        </Link>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.01em] text-foreground">Import products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV or Excel file to add products in bulk.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
