"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatMoney";

interface MonthRevenueChartProps {
  byDay: { date: string; revenue: string }[];
  currency: string;
  lakhCroreFormat: boolean;
}

export function MonthRevenueChart({ byDay, currency, lakhCroreFormat }: MonthRevenueChartProps) {
  const fmt = { currency, lakhCroreFormat };
  const chartData = byDay.map((d) => ({ date: d.date, revenue: Number(d.revenue) }));

  return (
    <Card>
      <p className="text-sm font-medium text-foreground">This month&apos;s revenue</p>
      <div className="mt-4 h-56">
        {chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No sales yet this month</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E4" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatMoney(Number(value), fmt)} />
              {/* Neutral fill, not the tenant accent color — ARCHITECTURE.md §5 reserves
                  accent for the nav dot, primary buttons, and small highlights only. */}
              <Bar dataKey="revenue" fill="#111110" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
