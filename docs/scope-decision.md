# Data Scope Decision

**Decision:** the pipeline uses only transactions from **2017-01-01 through 2018-12-31** (two full, consecutive calendar years) out of the full 2010-2019 dataset.

**Why:** Phase 1 inspection showed transaction volume climbing steadily from 1.24M (2010) to a peak around 1.39-1.40M/year in 2016-2018, then dropping to 1.16M in 2019 — not because activity actually fell, but because the 2019 data is truncated (it ends October 31, not December 31). 2017 and 2018 are the two highest-volume years that are each *fully* represented, avoiding both the partial 2019 tail and the lower, still-ramping-up volume of the early 2010s. That gives roughly 2.79M transactions across two clean, comparable years — enough for meaningful month-over-month and year-over-year analysis without carrying eight years of data the project doesn't need.

**Where this is applied:** the date filter is applied once, at ingestion (Phase 3), directly on `transactions_data.csv`. Tables that join to transactions — like `fraud_labels` — don't need their own separate date filter; once transactions are scoped to 2017-2018, any label referencing a transaction outside that range simply has no match and is naturally excluded by the join.

## Addendum: raw_fraud_labels ended up scoped too — for a different reason

`raw_fraud_labels` is also filtered down to only the transaction_ids present in the 2017-2018 `raw_transactions` table, but that wasn't a deliberate data-quality or volume choice like the transactions scoping above — it was forced by Neon's free-tier **512MB total project storage cap**.

Loading the raw files unfiltered first (Phase 3) showed: the unfiltered `raw_fraud_labels` table alone (8,914,963 rows, all years) was **377MB**; the full 2017-2018 `raw_transactions` needed roughly **444MB**; together that's **~822MB against a 512MB budget** — well over, regardless of anything else in the project.

Filtering `raw_fraud_labels` to just the transaction_ids that exist in `raw_transactions` brought it down to **1,871,883 rows**, letting everything fit at 445MB total. That's **67.0% coverage** within the 2017-2018 slice — consistent with the 67% coverage found across the *full* dataset in Phase 1, so the filtering didn't skew the label distribution, it just removed labels for transactions outside the project's scope entirely (which could never be joined to anything downstream anyway).
*I have no intention to pay for a neon upgrade, so I'm following (and creating) any free option🥰*

## Addendum: is_duplicate_candidate rows kept in fct_transactions, excluded from financial aggregates

`fct_transactions` flags 36 transactions (within the 2017-2018 scope) as `is_duplicate_candidate` — the same client/card/minute/merchant/amount pattern Phase 1 first found, read as a genuine duplicate-write artifact in the source system rather than coincidence.

These rows are **kept, not deleted**, in `fct_transactions` — the flag stays visible there for audit purposes, so the pipeline never silently drops source data.

They **are excluded** (`where is_duplicate_candidate = false`) from `fct_cashflow_summary`, and should be excluded from any future health-score or other financial-total calculation. The distinction from the zero-amount case: zero-amount transactions are ambiguous (could be legitimate authorization holds), so they're only flagged, not filtered anywhere. Duplicate candidates are a high-confidence call — adjacent transaction IDs, identical everything — so letting them inflate a spending/income total would misrepresent the real numbers, and the cost of excluding a genuine (non-duplicate) coincidental match is low given how rare and tightly-matched the pattern is.
