"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MonthFilterProps {
  month: string;
}

export function MonthFilter({ month }: MonthFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <Input
        type="month"
        value={month}
        onChange={(e) => router.push(`${pathname}?month=${e.target.value}`)}
        className="w-44"
      />
      <Button type="button" variant="secondary" size="sm" onClick={() => router.push(`${pathname}?month=all`)}>
        All time
      </Button>
    </div>
  );
}
