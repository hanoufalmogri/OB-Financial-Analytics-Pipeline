import { getCashflowTrend } from "@/lib/db";
import CashflowChart from "@/components/CashflowChart";

export default async function CashflowPage() {
  const data = await getCashflowTrend();
  const totalOutflow = data.reduce((sum, d) => sum + d.total_outflow, 0);
  const totalInflow = data.reduce((sum, d) => sum + d.total_inflow, 0);

  return (
    <>
      <p className="eyebrow">Cash Flow Trend</p>
      <h1>Outflow vs. inflow, 2017&ndash;2018</h1>
      <p className="page-desc">
        Total outflow (spending) vs. total inflow (refunds/credits), summed across all users, per month.
        &ldquo;Inflow&rdquo; here means money credited back to a card &mdash; this dataset has no payroll
        or deposit data, so it isn&apos;t income in the traditional sense.
      </p>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <p className="stat-label">Total Outflow (24 months)</p>
          <p className="stat-value">
            ${totalOutflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="card">
          <p className="stat-label">Total Inflow (24 months)</p>
          <p className="stat-value">
            ${totalInflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="card">
        <CashflowChart data={data} />
      </div>
    </>
  );
}
