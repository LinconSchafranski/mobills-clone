"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type CategoryExpenseTotal = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const tickColor = "#71717a";

export function ExpensesByCategoryChart({ data }: { data: CategoryExpenseTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Nenhuma despesa registrada neste mês.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.color} stroke="var(--background)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => currencyFormatter.format(Number(value))}
            contentStyle={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid rgba(127,127,127,0.3)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend formatter={(value: string) => <span style={{ color: tickColor }}>{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
