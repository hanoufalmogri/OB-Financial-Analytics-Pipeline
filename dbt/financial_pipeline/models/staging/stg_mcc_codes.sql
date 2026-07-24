select
    mcc_code::int as mcc_code,
    category_description
from {{ source('bronze', 'raw_mcc_codes') }}
