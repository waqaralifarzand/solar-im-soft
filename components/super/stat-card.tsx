import { Card } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.01em] text-foreground">{value}</p>
    </Card>
  );
}
