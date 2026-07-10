import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  href?: string;
  tone?: "default" | "warning";
}

export function StatCard({ label, value, href, tone = "default" }: StatCardProps) {
  const content = (
    <Card className={cn(href && "transition-colors hover:bg-surface")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", tone === "warning" ? "text-warning" : "text-foreground")}>
        {value}
      </p>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
