select
    id::int as user_id,
    current_age::int as current_age,
    retirement_age::int as retirement_age,
    birth_year::int as birth_year,
    birth_month::int as birth_month,
    gender,
    address,
    latitude::numeric as latitude,
    longitude::numeric as longitude,
    replace(per_capita_income, '$', '')::numeric as per_capita_income,
    replace(yearly_income, '$', '')::numeric as yearly_income,
    replace(total_debt, '$', '')::numeric as total_debt,
    credit_score::int as credit_score,
    num_credit_cards::int as num_credit_cards
from {{ source('bronze', 'raw_users') }}
