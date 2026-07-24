select
    id::int as card_id,
    client_id::int as user_id,
    card_brand,
    card_type,
    right(card_number, 4) as card_last_four,
    split_part(expires, '/', 1)::int as expire_month,
    split_part(expires, '/', 2)::int as expire_year,
    (has_chip = 'YES') as has_chip,
    num_cards_issued::int as num_cards_issued,
    replace(credit_limit, '$', '')::numeric as credit_limit,
    split_part(acct_open_date, '/', 1)::int as acct_open_month,
    split_part(acct_open_date, '/', 2)::int as acct_open_year,
    year_pin_last_changed::int as year_pin_last_changed,
    (card_on_dark_web = 'Yes') as card_on_dark_web
from {{ source('bronze', 'raw_cards') }}
