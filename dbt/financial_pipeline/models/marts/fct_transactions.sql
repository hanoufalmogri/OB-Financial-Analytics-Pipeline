{{ config(materialized='view') }}

select
    t.transaction_id,
    t.transaction_ts,
    c.user_id,
    t.card_id,
    t.amount,
    t.use_chip,
    t.merchant_id,
    t.merchant_city,
    t.merchant_state,
    t.zip,
    t.mcc_code,
    m.category_description as mcc_category,
    t.error_type,
    t.is_zero_amount,
    t.is_duplicate_candidate,
    f.is_fraud
from {{ ref('stg_transactions') }} t
left join {{ ref('stg_cards') }} c on t.card_id = c.card_id
left join {{ ref('stg_mcc_codes') }} m on t.mcc_code = m.mcc_code
left join {{ ref('stg_fraud_labels') }} f on t.transaction_id = f.transaction_id
