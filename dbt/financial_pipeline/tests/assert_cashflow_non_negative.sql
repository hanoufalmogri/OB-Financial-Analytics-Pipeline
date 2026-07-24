select *
from {{ ref('fct_cashflow_summary') }}
where total_inflow < 0 or total_outflow < 0
