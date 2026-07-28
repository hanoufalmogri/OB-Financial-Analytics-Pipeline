"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

// Deliberately not a traffic-light green/red -- stays within the site's own
// palette. Quiet (muted) reads as "nothing to see here"; the accent color is
// reserved for percentiles worth a second look.
function percentileClass(value: number): string {
  if (value < 34) return "text-attention";
  if (value >= 67) return "text-quiet";
  return "";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className={`stat-value ${percentileClass(value)}`}>{value.toFixed(1)}</p>
    </div>
  );
}

export default function HealthScoreExplorer({ rows }: { rows: HealthScoreRow[] }) {
  const buckets = useMemo(() => bucketize(rows), [rows]);
  const [selectedId, setSelectedId] = useState<number>(rows[0]?.user_id ?? 0);
  const [inputValue, setInputValue] = useState<string>(String(rows[0]?.user_id ?? ""));
  const selected = rows.find((r) => r.user_id === selectedId) ?? rows[0];
  const selectedBucket = selected ? Math.min(9, Math.floor(selected.health_score_percentile / 10)) : -1;

  function commitLookup(raw: string) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && rows.some((r) => r.user_id === parsed)) {
      setSelectedId(parsed);
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <p className="stat-label">Distribution across all {rows.length.toLocaleString()} scored users</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={buckets} margin={{ top: 8, right: 20, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#E4D9D9" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 11, fill: "#7A6165" }}
              axisLine={{ stroke: "#E4D9D9" }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#7A6165" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #E4D9D9",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value) => [`${value} users`, "Count"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {buckets.map((_, i) => (
                <Cell key={i} fill={i === selectedBucket ? "#9C2B47" : "#D8C3C3"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {selected && (
          <p className="stat-sub">
            User {selected.user_id} falls in the {buckets[selectedBucket].range} percentile bucket, highlighted above.
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
          <p className="stat-label" style={{ margin: 0 }}>
            Look up a user
          </p>
          <input
            className="input"
            style={{ width: 160 }}
            list="health-score-user-ids"
            value={inputValue}
            placeholder="User ID"
            onChange={(e) => {
              setInputValue(e.target.value);
              commitLookup(e.target.value);
            }}
          />
          <datalist id="health-score-user-ids">
            {rows.map((r) => (
              <option key={r.user_id} value={r.user_id} />
            ))}
          </datalist>
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
