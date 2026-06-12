"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type CategoryData = { category: string; total: number };

const COLORS = [
  "hsl(var(--primary))",
  "hsl(220 70% 60%)",
  "hsl(160 60% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 72% 51%)",
  "hsl(190 90% 50%)",
];

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sem dados para o período.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          formatter={(v) => [formatBRL(v as number), "Total"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            fontSize: 13,
          }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
