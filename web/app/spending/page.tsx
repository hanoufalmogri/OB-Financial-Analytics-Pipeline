import { getSpendingByCategory } from "@/lib/db";
import CategoryChart from "@/components/CategoryChart";

export default async function SpendingPage() {
  const { rows, currentMonthLabel, priorMonthLabel } = await getSpendingByCategory();
  const top = rows.slice(0, 15);
  const rest = rows.slice(15);

  return (
    <>
      <p className="eyebrow">Spending by Category</p>
      <h1>
        {currentMonthLabel} vs. {priorMonthLabel}
      </h1>
      <p className="page-desc">
        Summed across all users. Showing the top 15 categories by current-month spend
        {rest.length > 0 ? ` (${rest.length} more below)` : ""}.
      </p>

      <div className="card">
        <CategoryChart data={top} />
      </div>

      {rest.length > 0 && (
        <div className="overflow-x" style={{ marginTop: 24 }}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Current month</th>
                <th>Prior month</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((r) => (
                <tr key={r.mcc_category}>
                  <td style={{ fontFamily: "var(--font-sans)" }}>{r.mcc_category}</td>
                  <td>${r.current_month_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>${r.prior_month_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
