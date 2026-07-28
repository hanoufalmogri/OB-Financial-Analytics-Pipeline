import { getCashflowTrend, getUserIds } from "@/lib/db";
import CashflowChart from "@/components/CashflowChart";
import UserCashflowLookup from "@/components/UserCashflowLookup";

export const metadata = { title: "Cash Flow | OB Financial Analytics" };

export default async function CashflowPage() {
  const [data, userIds] = await Promise.all([getCashflowTrend(), getUserIds()]);
  const totalOutflow = data.reduce((sum, d) => sum + d.total_outflow, 0);
  const totalInflow = data.reduce((sum, d) => sum + d.total_inflow, 0);
  const net = totalInflow - totalOutflow;

  return (
    <>
      <p className="eyebrow">Cash Flow Trend</p>
      <h1>Outflow vs. inflow, 2017&ndash;2018</h1>
      <p className="page-desc">
        Outflow is spending, inflow is refunds and credits, summed across all users, per month.
        There&apos;s no payroll or deposit data here, so &ldquo;inflow&rdquo; isn&apos;t income, just
        money that came back.
      </p>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
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
        <div className="card">
          <p className="stat-label">Net Cash Flow (24 months)</p>
          <p className={`stat-value ${net < 0 ? "text-attention" : "text-quiet"}`}>
            ${net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="card">
        <CashflowChart data={data} />
      </div>

      <UserCashflowLookup userIds={userIds} />
    </>
  );
}
