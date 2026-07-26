import { getHealthScores } from "@/lib/db";
import HealthScoreExplorer from "@/components/HealthScoreExplorer";

export default async function HealthScorePage() {
  const rows = await getHealthScores();

  return (
    <>
      <p className="eyebrow">Financial Health Score</p>
      <h1>Percentile-based, relative to the user population</h1>
      <p className="page-desc">
        Combines savings rate, spending stability, and debt-to-income into one averaged percentile &mdash;
        relative standing, not an absolute grade. Only users with at least one 2017&ndash;2018 transaction
        have a score ({rows.length.toLocaleString()} of 2,000 users).
      </p>

      <HealthScoreExplorer rows={rows} />
    </>
  );
}
