import { getRecurringPayments } from "@/lib/db";

export default async function RecurringPage() {
  const payments = await getRecurringPayments();

  return (
    <>
      <p className="eyebrow">Recurring Payments</p>
      <h1>{payments.length} detected series</h1>
      <p className="page-desc">
        Grouped by card + merchant + similar amount, then checked for a regular repeat interval.
      </p>

      <div className="badge" style={{ marginBottom: 24 }}>
        Low-confidence candidates &mdash; not a confirmed subscription list. Detection is based purely on
        amount + interval matching, with no merchant name data available to corroborate the match. See
        docs/scope-decision.md for the full limitation.
      </div>

      <div className="overflow-x">
        <table>
          <thead>
            <tr>
              <th>Card ID</th>
              <th>Merchant ID</th>
              <th>Typical amount</th>
              <th>Frequency</th>
              <th>Occurrences</th>
              <th>First seen</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
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
      </div>
    </>
  );
}
