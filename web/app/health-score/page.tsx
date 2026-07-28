import { getHealthScores } from "@/lib/db";
import HealthScoreExplorer from "@/components/HealthScoreExplorer";

export const metadata = { title: "Health Score | OB Financial Analytics" };

export default async function HealthScorePage() {
  const rows = await getHealthScores();

  return (
    <>
      <p className="eyebrow">Financial Health Score</p>
      <h1>Percentile-based, relative to the user population</h1>
      <p className="page-desc">
        Savings rate, spending stability, and debt-to-income, averaged into one percentile. It tells
        you where someone stands next to everyone else, not whether they&apos;re doing well.
        {" "}
        {rows.length.toLocaleString()} of 2,000 users show up here. The rest never made a
        transaction in this window, which is its own kind of answer.
      </p>

      {rows.length === 0 ? (
        <p className="stat-sub">No scored users.</p>
      ) : (
        <HealthScoreExplorer rows={rows} />
      )}
    </>
  );
}
