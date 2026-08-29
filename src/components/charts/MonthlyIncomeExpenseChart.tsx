"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyTotal = {
  month: string;
  label: string;
  income: number;
  expense: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const tickColor = "#71717a";
const gridColor = "rgba(127,127,127,0.25)";

const seriesLabels: Record<string, string> = {
  income: "Receitas",
  expense: "Despesas",
};

export function MonthlyIncomeExpenseChart({ data }: { data: MonthlyTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Nenhuma transação cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: tickColor }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: tickColor }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => currencyFormatter.format(value)}
          />
          <Tooltip
            cursor={{ fill: "rgba(127,127,127,0.1)" }}
            formatter={(value, name) => [
              currencyFormatter.format(Number(value)),
              seriesLabels[String(name)] ?? String(name),
            ]}
            contentStyle={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid rgba(127,127,127,0.3)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value: string) => (
              <span style={{ color: tickColor }}>{seriesLabels[value] ?? value}</span>
            )}
          />
          <Bar dataKey="income" name="income" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
