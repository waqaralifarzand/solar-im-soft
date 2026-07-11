"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/formatMoney";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SalesReport } from "@/lib/queries/reports";

interface SalesReportViewProps {
  report: SalesReport;
  currency: string;
  lakhCroreFormat: boolean;
}

export function SalesReportView({ report, currency, lakhCroreFormat }: SalesReportViewProps) {
  const fmt = { currency, lakhCroreFormat };
  const chartData = report.byDay.map((d) => ({ date: d.date, revenue: Number(d.revenue) }));

  function handleExport() {
    downloadCsv(
      "sales-report.csv",
      ["Date", "Revenue"],
      report.byDay.map((d) => [d.date, d.revenue]),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted-foreground">Invoices</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{report.invoiceCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatMoney(report.revenue, fmt)}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Revenue by day</p>
          <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
        <div className="mt-4 h-64">
          {chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No sales in this range</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E4" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value), fmt)} cursor={{ fill: "#DBEAFE" }} />
                {/* Fixed chart-primary token (#2563EB, app/globals.css), not the tenant accent
                    color — ARCHITECTURE.md §5 reserves accent for the nav dot, primary buttons,
                    and small highlights only; charts always use this data-visualization blue. */}
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
