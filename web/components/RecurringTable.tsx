"use client";

import { useMemo, useState } from "react";
import type { RecurringPayment } from "@/lib/db";

type SortKey = keyof Pick<
  RecurringPayment,
  "card_id" | "merchant_id" | "typical_amount" | "detected_frequency" | "occurrence_count" | "first_occurrence" | "last_occurrence"
>;

function SortHeader({
  label,
  sortKey,
  active,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  return (
    <th>
      <button onClick={() => onSort(sortKey)}>
        {label}
        {active ? (direction === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

export default function RecurringTable({ payments }: { payments: RecurringPayment[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("occurrence_count");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("desc");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim();
    const rows = term
      ? payments.filter(
          (p) =>
            String(p.card_id).includes(term) ||
            String(p.merchant_id).includes(term) ||
            p.detected_frequency.toLowerCase().includes(term.toLowerCase())
        )
      : payments;

    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return direction === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [payments, search, sortKey, direction]);

  return (
    <>
      <input
        className="input"
        style={{ maxWidth: 280, marginBottom: 16 }}
        placeholder="Filter by card ID, merchant ID, or frequency"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x">
        <table>
          <thead>
            <tr>
              <SortHeader label="Card ID" sortKey="card_id" active={sortKey === "card_id"} direction={direction} onSort={onSort} />
              <SortHeader label="Merchant ID" sortKey="merchant_id" active={sortKey === "merchant_id"} direction={direction} onSort={onSort} />
              <SortHeader label="Typical amount" sortKey="typical_amount" active={sortKey === "typical_amount"} direction={direction} onSort={onSort} />
              <SortHeader label="Frequency" sortKey="detected_frequency" active={sortKey === "detected_frequency"} direction={direction} onSort={onSort} />
              <SortHeader label="Occurrences" sortKey="occurrence_count" active={sortKey === "occurrence_count"} direction={direction} onSort={onSort} />
              <SortHeader label="First seen" sortKey="first_occurrence" active={sortKey === "first_occurrence"} direction={direction} onSort={onSort} />
              <SortHeader label="Last seen" sortKey="last_occurrence" active={sortKey === "last_occurrence"} direction={direction} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={`${p.card_id}-${p.merchant_id}-${i}`}>
                <td>{p.card_id}</td>
                <td>{p.merchant_id}</td>
                <td>${p.typical_amount.toFixed(2)}</td>
                <td style={{ fontFamily: "var(--font-sans)", textTransform: "capitalize" }}>
                  {p.detected_frequency}
                </td>
                <td>{p.occurrence_count}</td>
                <td>{p.first_occurrence}</td>
                <td>{p.last_occurrence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="stat-sub" style={{ padding: 16 }}>
            No series match that filter.
          </p>
        )}
      </div>
    </>
  );
}
