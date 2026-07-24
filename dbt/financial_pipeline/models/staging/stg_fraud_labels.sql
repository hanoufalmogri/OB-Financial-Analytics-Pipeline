select
    transaction_id::bigint as transaction_id,
    (is_fraud = 'Yes') as is_fraud
from {{ source('bronze', 'raw_fraud_labels') }}
