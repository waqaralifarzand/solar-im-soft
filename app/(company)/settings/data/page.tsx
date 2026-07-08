import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function DataSettingsPage() {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-card bg-surface">
        <Download className="text-muted-foreground" size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">CSV exports</p>
        <p className="mt-1 text-sm text-muted-foreground">Data exports land in a later phase.</p>
      </div>
    </Card>
  );
}
