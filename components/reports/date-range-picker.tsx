"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { defaultMonthRangeStrings } from "@/lib/reportDateRange";
import { Input } from "@/components/ui/input";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaults = defaultMonthRangeStrings();
  const fromStr = searchParams.get("from") ?? defaults.from;
  const toStr = searchParams.get("to") ?? defaults.to;

  function updateParam(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", key === "from" ? value : fromStr);
    params.set("to", key === "to" ? value : toStr);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={fromStr} onChange={(e) => updateParam("from", e.target.value)} className="w-40" />
      <span className="text-sm text-muted-foreground">to</span>
      <Input type="date" value={toStr} onChange={(e) => updateParam("to", e.target.value)} className="w-40" />
    </div>
  );
}
