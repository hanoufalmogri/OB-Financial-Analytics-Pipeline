{{ config(materialized='table') }}

with monthly_cashflow as (

    select
        user_id,
        avg(total_outflow) as avg_monthly_outflow,
        stddev(total_outflow) as stddev_monthly_outflow
    from {{ ref('fct_cashflow_summary') }}
    group by user_id

),

components as (

    -- Inner join is deliberate: only users with at least one 2017-2018
    -- transaction have any basis for a health score. Verified beforehand
    -- that no user has yearly_income = 0 or avg_monthly_outflow = 0, so
    -- none of these divisions can fail -- see assert_no_zero_income_users
    -- and assert_no_zero_avg_outflow_users for the standing regression guard.
    select
        u.user_id,
        (u.yearly_income / 12.0 - c.avg_monthly_outflow) / (u.yearly_income / 12.0) as savings_rate,
        c.stddev_monthly_outflow / c.avg_monthly_outflow as spending_volatility,
        u.total_debt / u.yearly_income as debt_to_income
    from monthly_cashflow c
    inner join {{ ref('stg_users') }} u on c.user_id = u.user_id

)

select
    user_id,
    round(savings_rate, 4) as savings_rate,
    round(spending_volatility, 4) as spending_volatility,
    round(debt_to_income, 4) as debt_to_income,

    -- Higher savings_rate is healthier, so rank ascending directly.
    round((percent_rank() over (order by savings_rate) * 100)::numeric, 2) as savings_rate_percentile,

    -- Lower volatility is healthier, so rank descending: the user with the
    -- LOWEST volatility lands at the top (100th) percentile here, not the 0th.
    round((percent_rank() over (order by spending_volatility desc) * 100)::numeric, 2) as spending_stability_percentile,

    -- Same inversion logic as volatility: lower debt-to-income is healthier.
    round((percent_rank() over (order by debt_to_income desc) * 100)::numeric, 2) as debt_to_income_percentile,

    -- Final score: plain average of the three percentiles above -- no
    -- arbitrary weighting, just relative standing against the population.
    round(((
        percent_rank() over (order by savings_rate)
        + percent_rank() over (order by spending_volatility desc)
        + percent_rank() over (order by debt_to_income desc)
    ) / 3.0 * 100)::numeric, 2) as health_score_percentile

from components
