select *
from {{ ref('stg_users') }}
where yearly_income = 0
