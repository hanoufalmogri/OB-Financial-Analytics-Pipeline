"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HealthScoreRow } from "@/lib/db";

function bucketize(rows: HealthScoreRow[]) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 10}`,
    count: 0,
  }));
  for (const row of rows) {
    const idx = Math.min(9, Math.floor(row.health_score_percentile / 10));
    buckets[idx].count += 1;
  }
  return buckets;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value.toFixed(1)}</p>
    </div>
  );
}

export default function HealthScoreExplorer({ rows }: { rows: HealthScoreRow[] }) {
  const buckets = useMemo(() => bucketize(rows), [rows]);
  const [selectedId, setSelectedId] = useState<number>(rows[0]?.user_id ?? 0);
  const selected = rows.find((r) => r.user_id === selectedId) ?? rows[0];

  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <p className="stat-label">Distribution across all {rows.length.toLocaleString()} scored users</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={buckets} margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#DCE2ED" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: "#5B6684" }}
              axisLine={{ stroke: "#DCE2ED" }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#5B6684" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #DCE2ED",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value) => [`${value} users`, "Count"]}
            />
            <Bar dataKey="count" fill="#101A33" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p className="stat-label" style={{ margin: 0 }}>
            Look up a user
          </p>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          >
            {rows.map((r) => (
              <option key={r.user_id} value={r.user_id}>
                User {r.user_id}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="grid grid-4">
            <Metric label="Health Score Percentile" value={selected.health_score_percentile} />
            <Metric label="Savings Rate Percentile" value={selected.savings_rate_percentile} />
            <Metric label="Spending Stability Percentile" value={selected.spending_stability_percentile} />
            <Metric label="Debt-to-Income Percentile" value={selected.debt_to_income_percentile} />
          </div>
        )}
      </div>
    </>
  );
}
