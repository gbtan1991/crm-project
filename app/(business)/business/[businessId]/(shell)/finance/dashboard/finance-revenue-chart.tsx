"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/invoice-money";
import type { FinanceRevenueMonth } from "@/lib/finance-dashboard";

export function FinanceRevenueChart({
  data,
  currency,
}: {
  data: FinanceRevenueMonth[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
          }
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--border))" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            color: "hsl(var(--popover-foreground))",
            fontSize: "0.8125rem",
          }}
          formatter={(value) => [
            formatMoney(Number(value ?? 0), currency),
            "Revenue",
          ]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--chart-1))" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
