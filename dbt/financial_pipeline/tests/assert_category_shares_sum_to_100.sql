select
    user_id,
    month,
    sum(category_share_pct) as total_share_pct
from {{ ref('spending_by_category') }}
group by user_id, month
having abs(sum(category_share_pct) - 100) > 0.5
