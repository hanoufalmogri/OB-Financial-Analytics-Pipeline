select *
from {{ ref('recurring_payments') }}
where occurrence_count < 3
