with cleaned as (

    select
        id::bigint as transaction_id,
        date::timestamp as transaction_ts,
        client_id::int as user_id,
        card_id::int as card_id,
        replace(amount, '$', '')::numeric as amount,
        use_chip,
        merchant_id::bigint as merchant_id,
        merchant_city,
        merchant_state,
        zip,
        mcc::int as mcc_code,
        errors as error_type
    from {{ source('bronze', 'raw_transactions') }}

)

select
    transaction_id,
    transaction_ts,
    user_id,
    card_id,
    amount,
    use_chip,
    merchant_id,
    merchant_city,
    merchant_state,
    zip,
    mcc_code,
    error_type,
    (amount = 0) as is_zero_amount,
    count(*) over (
        partition by user_id, card_id, transaction_ts, merchant_id, amount
    ) > 1 as is_duplicate_candidate
from cleaned
