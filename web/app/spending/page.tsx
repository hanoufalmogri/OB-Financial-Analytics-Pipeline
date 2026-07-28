import { getSpendingByCategory, getUserIds } from "@/lib/db";
import CategoryChart from "@/components/CategoryChart";
import UserSpendingLookup from "@/components/UserSpendingLookup";

export const metadata = { title: "Spending | OB Financial Analytics" };

export default async function SpendingPage() {
  const [{ rows, currentMonthLabel, priorMonthLabel }, userIds] = await Promise.all([
    getSpendingByCategory(),
    getUserIds(),
  ]);
  const top = rows.slice(0, 15);
  const rest = rows.slice(15);
  const hasData = rows.length > 0;

  return (
    <>
      <p className="eyebrow">Spending by Category</p>
      <h1>{hasData ? `${currentMonthLabel} vs. ${priorMonthLabel}` : "No spending data"}</h1>
      <p className="page-desc">
        Every category, summed across all users, this month against last. Fifteen categories shown
        here; the rest are one scroll away
        {rest.length > 0 ? ` (${rest.length} more below)` : ""}.
      </p>

      {hasData && (
        <>
          <div className="card">
            <CategoryChart data={top} />
          </div>

          {rest.length > 0 && (
            <>
              <p className="section-heading">Remaining categories</p>
              <div className="overflow-x">
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
            </>
          )}
        </>
      )}

      <UserSpendingLookup userIds={userIds} />
    </>
  );
}
