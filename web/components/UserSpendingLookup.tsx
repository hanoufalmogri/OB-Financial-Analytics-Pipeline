"use client";

import { useState } from "react";
import type { AgentCategorySpend } from "@/lib/db";

const currency = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function UserSpendingLookup({ userIds }: { userIds: number[] }) {
  const [userInput, setUserInput] = useState("");
  const [month, setMonth] = useState("2018-06");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AgentCategorySpend[] | null>(null);

  async function lookup(userRaw: string, monthValue: string) {
    const parsed = Number(userRaw);
    if (!Number.isFinite(parsed) || !userIds.includes(parsed) || !monthValue) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spending/${parsed}/${monthValue}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <p className="stat-label" style={{ margin: 0 }}>
          Look up one user, one month
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ width: 120 }}
            list="spending-user-ids"
            value={userInput}
            placeholder="User ID"
            onChange={(e) => {
              setUserInput(e.target.value);
              lookup(e.target.value, month);
            }}
          />
          <datalist id="spending-user-ids">
            {userIds.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <input
            className="input"
            style={{ width: 150 }}
            type="month"
            min="2017-01"
            max="2018-12"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              lookup(userInput, e.target.value);
            }}
          />
        </div>
      </div>

      {loading && <p className="stat-sub">Loading&hellip;</p>}
      {error && <p className="text-attention">{error}</p>}

      {rows && !loading && (
        rows.length === 0 ? (
          <p className="stat-sub">No spending for that user in that month.</p>
        ) : (
          <div className="overflow-x">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Spent</th>
                  <th>Share of month</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.mcc_category}>
                    <td style={{ fontFamily: "var(--font-sans)" }}>{r.mcc_category}</td>
                    <td>{currency(r.total_spent)}</td>
                    <td>{r.category_share_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
