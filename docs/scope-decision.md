# Data Scope Decision

**Decision:** the pipeline uses only transactions from **2017-01-01 through 2018-12-31** (two full, consecutive calendar years) out of the full 2010-2019 dataset.

**Why:** Phase 1 inspection showed transaction volume climbing steadily from 1.24M (2010) to a peak around 1.39-1.40M/year in 2016-2018, then dropping to 1.16M in 2019 — not because activity actually fell, but because the 2019 data is truncated (it ends October 31, not December 31). 2017 and 2018 are the two highest-volume years that are each *fully* represented, avoiding both the partial 2019 tail and the lower, still-ramping-up volume of the early 2010s. That gives roughly 2.79M transactions across two clean, comparable years — enough for meaningful month-over-month and year-over-year analysis without carrying eight years of data the project doesn't need.

**Where this is applied:** the date filter is applied once, at ingestion (Phase 3), directly on `transactions_data.csv`. Tables that join to transactions — like `fraud_labels` — don't need their own separate date filter; once transactions are scoped to 2017-2018, any label referencing a transaction outside that range simply has no match and is naturally excluded by the join.
