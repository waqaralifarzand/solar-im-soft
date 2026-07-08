import { cn } from "@/lib/utils";

type ChipVariant = "success" | "warning" | "destructive" | "neutral";

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-surface text-muted-foreground",
};

export function StatusChip({ variant, children }: { variant: ChipVariant; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
      )}
    >
      {children}
    </span>
  );
}
