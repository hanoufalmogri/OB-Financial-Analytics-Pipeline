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
        <CartesianGrid stroke="#DCE2ED" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#5B6684" }}
          axisLine={{ stroke: "#DCE2ED" }}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
        />
        <YAxis
          type="category"
          dataKey="mcc_category"
          width={220}
          tick={{ fontSize: 11.5, fill: "#101A33" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #DCE2ED",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value) => currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="current_month_spend" name="Current month" fill="#101A33" radius={[0, 4, 4, 0]} />
        <Bar dataKey="prior_month_spend" name="Prior month" fill="#A9B4CC" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
