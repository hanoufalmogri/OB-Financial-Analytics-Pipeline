"use client";

import { useState } from "react";
import CashflowChart from "./CashflowChart";
import type { CashflowPoint } from "@/lib/db";

const currency = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function UserCashflowLookup({ userIds }: { userIds: number[] }) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CashflowPoint[] | null>(null);
  const [lookedUpId, setLookedUpId] = useState<number | null>(null);

  async function lookup(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !userIds.includes(parsed)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cashflow/${parsed}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");
      setRows(data.rows);
      setLookedUpId(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  const totalOutflow = rows?.reduce((sum, r) => sum + r.total_outflow, 0) ?? 0;
  const totalInflow = rows?.reduce((sum, r) => sum + r.total_inflow, 0) ?? 0;
  const net = totalInflow - totalOutflow;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <p className="stat-label" style={{ margin: 0 }}>
          Look up one user
        </p>
        <input
          className="input"
          style={{ width: 160 }}
          list="cashflow-user-ids"
          value={inputValue}
          placeholder="User ID"
          onChange={(e) => {
            setInputValue(e.target.value);
            lookup(e.target.value);
          }}
        />
        <datalist id="cashflow-user-ids">
          {userIds.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      </div>

      {loading && <p className="stat-sub">Loading&hellip;</p>}
      {error && <p className="text-attention">{error}</p>}

      {rows && lookedUpId !== null && !loading && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 20 }}>
            <div>
              <p className="stat-label">User</p>
              <p className="stat-value">{lookedUpId}</p>
            </div>
            <div>
              <p className="stat-label">Total Outflow</p>
              <p className="stat-value">{currency(totalOutflow)}</p>
            </div>
            <div>
              <p className="stat-label">Total Inflow</p>
              <p className="stat-value">{currency(totalInflow)}</p>
            </div>
            <div>
              <p className="stat-label">Net Cash Flow</p>
              <p className={`stat-value ${net < 0 ? "text-attention" : "text-quiet"}`}>{currency(net)}</p>
            </div>
          </div>
          <CashflowChart data={rows} />
        </>
      )}
    </div>
  );
}
