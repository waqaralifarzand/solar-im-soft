"use client";

import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProfitReport } from "@/lib/queries/reports";

interface ProfitReportViewProps {
  report: ProfitReport;
  currency: string;
  lakhCroreFormat: boolean;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex w-64 justify-between ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ProfitReportView({ report, currency, lakhCroreFormat }: ProfitReportViewProps) {
  const fmt = { currency, lakhCroreFormat };

  function handleExport() {
    downloadCsv(
      "profit-report.csv",
      ["Metric", "Amount"],
      [
        ["Revenue (pre-tax, net of discount and returns)", report.revenue],
        ["COGS (net of returns)", report.cogs],
        ["Expenses", report.expenses],
        ["Profit", report.profit],
      ],
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Profit &amp; loss</p>
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Revenue is pre-tax and net of discounts and returns; COGS is net of returns.
      </p>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Row label="Revenue" value={formatMoney(report.revenue, fmt)} />
        <Row label="COGS" value={`-${formatMoney(report.cogs, fmt)}`} />
        <Row label="Expenses" value={`-${formatMoney(report.expenses, fmt)}`} />
        <div className="w-64 border-t border-border pt-2">
          <Row label="Profit" value={formatMoney(report.profit, fmt)} bold />
        </div>
      </div>
    </Card>
  );
}
