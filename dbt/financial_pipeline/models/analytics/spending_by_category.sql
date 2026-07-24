with category_spend as (

    select
        user_id,
        date_trunc('month', transaction_ts)::date as month,
        coalesce(mcc_category, 'Uncategorized') as mcc_category,
        sum(amount) as total_spent
    from {{ ref('fct_transactions') }}
    where amount > 0
      and is_duplicate_candidate = false
    group by user_id, date_trunc('month', transaction_ts), coalesce(mcc_category, 'Uncategorized')

)

select
    user_id,
    month,
    mcc_category,
    total_spent,
    round(100 * total_spent / sum(total_spent) over (partition by user_id, month), 2) as category_share_pct
from category_spend
