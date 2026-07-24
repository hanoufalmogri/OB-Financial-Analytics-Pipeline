select user_id, avg(total_outflow) as avg_outflow
from {{ ref('fct_cashflow_summary') }}
group by user_id
having avg(total_outflow) = 0
