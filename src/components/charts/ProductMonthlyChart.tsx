"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ProductMonthlyPoint = {
  month: string;
  label: string;
  total: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const currencyFormatterFull = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const tickColor = "#71717a";
const gridColor = "rgba(127,127,127,0.25)";

export function ProductMonthlyChart({ data }: { data: ProductMonthlyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            formatter={(value) => [currencyFormatterFull.format(Number(value)), "Total gasto"]}
            contentStyle={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid rgba(127,127,127,0.3)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="total" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
