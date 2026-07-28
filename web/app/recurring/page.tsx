import { getRecurringPayments } from "@/lib/db";
import RecurringTable from "@/components/RecurringTable";

export const metadata = { title: "Recurring Payments | OB Financial Analytics" };

export default async function RecurringPage() {
  const payments = await getRecurringPayments();

  return (
    <>
      <p className="eyebrow">Recurring Payments</p>
      <h1>{payments.length} detected series</h1>
      <p className="page-desc">
        Same card, same merchant, similar amount, on a regular interval. That&apos;s the whole test.
      </p>

      <div className="callout" style={{ marginBottom: 24 }}>
        <strong>Low-confidence candidates, not subscriptions.</strong> There&apos;s no merchant name in
        this data, so a $4 coffee every Tuesday looks identical to a real subscription. It probably
        isn&apos;t one. See docs/scope-decision.md for the honest version of this caveat.
      </div>

      {payments.length === 0 ? (
        <p className="stat-sub">No recurring series detected.</p>
      ) : (
        <RecurringTable payments={payments} />
      )}
    </>
  );
}
