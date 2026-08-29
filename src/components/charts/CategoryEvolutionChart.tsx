"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CategoryEvolutionSeries = {
  key: string;
  label: string;
  color: string;
};

export type CategoryEvolutionPoint = {
  month: string;
  label: string;
  [seriesKey: string]: string | number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const tickColor = "#71717a";
const gridColor = "rgba(127,127,127,0.25)";

export function CategoryEvolutionChart({
  data,
  series,
}: {
  data: CategoryEvolutionPoint[];
  series: CategoryEvolutionSeries[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function toggleSeries(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Nenhuma despesa cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            formatter={(value, name) => [currencyFormatter.format(Number(value)), String(name)]}
            contentStyle={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              border: "1px solid rgba(127,127,127,0.3)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend
            onClick={(entry) => {
              if (typeof entry.dataKey === "string") toggleSeries(entry.dataKey);
            }}
            formatter={(value, entry) => {
              const isHidden = typeof entry.dataKey === "string" && hidden.has(entry.dataKey);
              return (
                <span
                  style={{
                    color: tickColor,
                    opacity: isHidden ? 0.4 : 1,
                    textDecoration: isHidden ? "line-through" : "none",
                    cursor: "pointer",
                  }}
                >
                  {value}
                </span>
              );
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              hide={hidden.has(s.key)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
