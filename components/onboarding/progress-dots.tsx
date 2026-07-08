import { cn } from "@/lib/utils";

export function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-pill", i <= step ? "bg-foreground" : "bg-surface")} />
      ))}
    </div>
  );
}
