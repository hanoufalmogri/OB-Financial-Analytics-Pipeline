select
    user_id,
    date_trunc('month', transaction_ts)::date as month,
    sum(case when amount > 0 then amount else 0 end) as total_outflow,
    sum(case when amount < 0 then abs(amount) else 0 end) as total_inflow,
    sum(case when amount > 0 then amount else 0 end)
        - sum(case when amount < 0 then abs(amount) else 0 end) as net_cashflow,
    count(*) as transaction_count
from {{ ref('fct_transactions') }}
where is_duplicate_candidate = false
group by user_id, date_trunc('month', transaction_ts)
