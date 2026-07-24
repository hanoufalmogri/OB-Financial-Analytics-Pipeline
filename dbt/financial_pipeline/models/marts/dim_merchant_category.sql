select
    mcc_code,
    category_description
from {{ ref('stg_mcc_codes') }}
