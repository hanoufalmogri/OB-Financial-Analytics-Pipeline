-- The date span between first and last occurrence should be mathematically
-- consistent with (occurrence_count - 1) gaps, each within the detected
-- frequency's day-range. If this ever fails, the detection logic itself
-- has a bug, not the underlying data.
select *
from {{ ref('recurring_payments') }}
where (last_occurrence - first_occurrence) < (occurrence_count - 1) * (
        case detected_frequency
            when 'weekly' then 6
            when 'biweekly' then 13
            when 'monthly' then 28
            when 'quarterly' then 89
        end
    )
   or (last_occurrence - first_occurrence) > (occurrence_count - 1) * (
        case detected_frequency
            when 'weekly' then 8
            when 'biweekly' then 15
            when 'monthly' then 31
            when 'quarterly' then 92
        end
    )
