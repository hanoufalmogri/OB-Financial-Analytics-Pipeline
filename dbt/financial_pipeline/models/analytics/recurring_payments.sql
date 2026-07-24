with base as (

    select
        card_id,
        merchant_id,
        round(amount) as amount_bucket,
        amount,
        transaction_ts
    from {{ ref('fct_transactions') }}
    where amount > 0
      and is_duplicate_candidate = false

),

gaps as (

    select
        card_id,
        merchant_id,
        amount_bucket,
        amount,
        transaction_ts,
        transaction_ts::date - lag(transaction_ts::date) over (
            partition by card_id, merchant_id, amount_bucket
            order by transaction_ts
        ) as gap_days
    from base

),

series as (

    select
        card_id,
        merchant_id,
        amount_bucket,
        count(*) as occurrence_count,
        min(transaction_ts)::date as first_occurrence,
        max(transaction_ts)::date as last_occurrence,
        avg(amount) as typical_amount,
        min(gap_days) as min_gap_days,
        max(gap_days) as max_gap_days
    from gaps
    group by card_id, merchant_id, amount_bucket
    having count(*) >= 3

),

classified as (

    select
        *,
        case
            when min_gap_days >= 6  and max_gap_days <= 8  then 'weekly'
            when min_gap_days >= 13 and max_gap_days <= 15 then 'biweekly'
            when min_gap_days >= 28 and max_gap_days <= 31 then 'monthly'
            when min_gap_days >= 89 and max_gap_days <= 92 then 'quarterly'
        end as detected_frequency
    from series

)

select
    card_id,
    merchant_id,
    round(typical_amount, 2) as typical_amount,
    detected_frequency,
    occurrence_count,
    first_occurrence,
    last_occurrence
from classified
where detected_frequency is not null
