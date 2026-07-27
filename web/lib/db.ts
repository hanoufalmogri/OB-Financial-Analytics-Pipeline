import { Pool, type QueryResultRow } from "pg";

// A module-level singleton, stashed on `global` so Next.js's dev-mode hot
// reloading doesn't spawn a fresh pool (and fresh connections) on every edit.
declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.pgPool) {
    global.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return global.pgPool;
}

async function query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export interface CashflowPoint {
  month: string;
  total_outflow: number;
  total_inflow: number;
}

export async function getCashflowTrend(): Promise<CashflowPoint[]> {
  const rows = await query<{ month: string; total_outflow: string; total_inflow: string }>(`
    select
      month::text as month,
      sum(total_outflow) as total_outflow,
      sum(total_inflow) as total_inflow
    from public_marts.fct_cashflow_summary
    group by month
    order by month
  `);
  // Cast to text in SQL rather than formatting a JS Date -- pg's default DATE
  // parser builds a Date at local midnight, so toISOString() (which converts
  // to UTC) silently shifts the label back a month whenever the server's
  // local timezone has a positive UTC offset. Slicing the raw "YYYY-MM-DD"
  // text avoids that entirely.
  return rows.map((r) => ({
    month: r.month.slice(0, 7),
    total_outflow: parseFloat(r.total_outflow),
    total_inflow: parseFloat(r.total_inflow),
  }));
}

export interface CategorySpend {
  mcc_category: string;
  current_month_spend: number;
  prior_month_spend: number;
}

export interface CategorySpendResult {
  rows: CategorySpend[];
  currentMonthLabel: string;
  priorMonthLabel: string;
}

export async function getSpendingByCategory(): Promise<CategorySpendResult> {
  const rows = await query<{
    mcc_category: string;
    current_month_spend: string;
    prior_month_spend: string;
    current_month: string;
    prior_month: string;
  }>(`
    with bounds as (
      select
        max(month) as current_month,
        max(month) - interval '1 month' as prior_month
      from public_analytics.spending_by_category
    )
    select
      s.mcc_category,
      sum(case when s.month = b.current_month then s.total_spent else 0 end) as current_month_spend,
      sum(case when s.month = b.prior_month then s.total_spent else 0 end) as prior_month_spend,
      max(b.current_month) as current_month,
      max(b.prior_month) as prior_month
    from public_analytics.spending_by_category s
    cross join bounds b
    where s.month in (b.current_month, b.prior_month)
    group by s.mcc_category
    order by current_month_spend desc
  `);

  const monthLabel = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return {
    rows: rows.map((r) => ({
      mcc_category: r.mcc_category,
      current_month_spend: parseFloat(r.current_month_spend),
      prior_month_spend: parseFloat(r.prior_month_spend),
    })),
    currentMonthLabel: rows.length ? monthLabel(rows[0].current_month) : "",
    priorMonthLabel: rows.length ? monthLabel(rows[0].prior_month) : "",
  };
}

export interface RecurringPayment {
  card_id: number;
  merchant_id: number;
  typical_amount: number;
  detected_frequency: string;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
}

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  const rows = await query<{
    card_id: number;
    merchant_id: number;
    typical_amount: string;
    detected_frequency: string;
    occurrence_count: number;
    first_occurrence: string;
    last_occurrence: string;
  }>(`
    select
      card_id, merchant_id, typical_amount, detected_frequency,
      occurrence_count,
      first_occurrence::text as first_occurrence,
      last_occurrence::text as last_occurrence
    from public_analytics.recurring_payments
    order by occurrence_count desc, typical_amount desc
  `);
  // Cast to text in SQL -- see the comment in getCashflowTrend for why a JS
  // Date + toISOString() round-trip silently shifts the date under a
  // positive-UTC-offset server timezone.
  return rows.map((r) => ({
    ...r,
    typical_amount: parseFloat(r.typical_amount),
    first_occurrence: r.first_occurrence.slice(0, 10),
    last_occurrence: r.last_occurrence.slice(0, 10),
  }));
}

export interface HealthScoreRow {
  user_id: number;
  savings_rate: number;
  spending_volatility: number;
  debt_to_income: number;
  savings_rate_percentile: number;
  spending_stability_percentile: number;
  debt_to_income_percentile: number;
  health_score_percentile: number;
}

export async function getHealthScores(): Promise<HealthScoreRow[]> {
  const rows = await query<Record<keyof HealthScoreRow, string | number>>(`
    select
      user_id, savings_rate, spending_volatility, debt_to_income,
      savings_rate_percentile, spending_stability_percentile,
      debt_to_income_percentile, health_score_percentile
    from public_analytics.health_score
    order by user_id
  `);
  return rows.map((r) => ({
    user_id: Number(r.user_id),
    savings_rate: parseFloat(String(r.savings_rate)),
    spending_volatility: parseFloat(String(r.spending_volatility)),
    debt_to_income: parseFloat(String(r.debt_to_income)),
    savings_rate_percentile: parseFloat(String(r.savings_rate_percentile)),
    spending_stability_percentile: parseFloat(String(r.spending_stability_percentile)),
    debt_to_income_percentile: parseFloat(String(r.debt_to_income_percentile)),
    health_score_percentile: parseFloat(String(r.health_score_percentile)),
  }));
}

// --- Phase 7 agent tools ---
// These two are the only functions the agent can call. Both take a user_id,
// keeping every query scoped to one person rather than exposing anything
// that could aggregate across users.

export interface AgentCashflowMonth {
  month: string;
  total_outflow: number;
  total_inflow: number;
  net_cashflow: number;
}

export async function getCashflowTrendForUser(userId: number): Promise<AgentCashflowMonth[]> {
  const rows = await query<{
    month: string;
    total_outflow: string;
    total_inflow: string;
    net_cashflow: string;
  }>(
    `
      select month::text as month, total_outflow, total_inflow, net_cashflow
      from public_marts.fct_cashflow_summary
      where user_id = $1
      order by month
    `,
    [userId]
  );
  // Cast to text in SQL rather than formatting a JS Date -- pg's default DATE
  // parser builds a Date at local midnight, so toISOString() (which converts
  // to UTC) silently shifts the label back a day whenever the server's local
  // timezone has a positive UTC offset. Slicing the raw "YYYY-MM-DD" text
  // avoids that entirely.
  return rows.map((r) => ({
    month: r.month.slice(0, 7),
    total_outflow: parseFloat(r.total_outflow),
    total_inflow: parseFloat(r.total_inflow),
    net_cashflow: parseFloat(r.net_cashflow),
  }));
}

export interface AgentCategorySpend {
  mcc_category: string;
  total_spent: number;
  category_share_pct: number;
}

// Accepts "YYYY-MM" or "YYYY-MM-DD" -- normalized to the first of the month,
// since that's how `month` is stored in spending_by_category.
function normalizeToFirstOfMonth(month: string): string {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) {
    throw new Error(`Expected a "YYYY-MM" month, got: ${month}`);
  }
  return `${match[1]}-${match[2]}-01`;
}

export async function getSpendingByCategoryForUser(
  userId: number,
  month: string
): Promise<AgentCategorySpend[]> {
  const rows = await query<{
    mcc_category: string;
    total_spent: string;
    category_share_pct: string;
  }>(
    `
      select mcc_category, total_spent, category_share_pct
      from public_analytics.spending_by_category
      where user_id = $1 and month = $2::date
      order by total_spent desc
    `,
    [userId, normalizeToFirstOfMonth(month)]
  );
  return rows.map((r) => ({
    mcc_category: r.mcc_category,
    total_spent: parseFloat(r.total_spent),
    category_share_pct: parseFloat(r.category_share_pct),
  }));
}
