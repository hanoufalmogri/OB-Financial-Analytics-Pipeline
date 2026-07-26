"use client";

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
import type { CashflowPoint } from "@/lib/db";

const currency = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="#DCE2ED" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#5B6684" }}
          axisLine={{ stroke: "#DCE2ED" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#5B6684" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          width={48}
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
        <Line
          type="monotone"
          dataKey="total_outflow"
          name="Outflow"
          stroke="#101A33"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="total_inflow"
          name="Inflow"
          stroke="#4A5A8C"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
