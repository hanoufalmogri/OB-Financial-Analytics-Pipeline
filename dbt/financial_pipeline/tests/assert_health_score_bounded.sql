select *
from {{ ref('health_score') }}
where health_score_percentile < 0 or health_score_percentile > 100
