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
import type { CategorySpend } from "@/lib/db";

const currency = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function CategoryChart({ data }: { data: CategorySpend[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(360, data.length * 30)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
        barGap={2}
      >
        <CartesianGrid stroke="#E4D9D9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#7A6165" }}
          axisLine={{ stroke: "#E4D9D9" }}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
        />
        <YAxis
          type="category"
          dataKey="mcc_category"
          width={220}
          tick={{ fontSize: 11.5, fill: "#241A1C" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E4D9D9",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value) => currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="current_month_spend" name="Current month" fill="#9C2B47" radius={[0, 4, 4, 0]} />
        <Bar dataKey="prior_month_spend" name="Prior month" fill="#D8C3C3" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
