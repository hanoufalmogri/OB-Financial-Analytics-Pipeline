# Phase 1 data inspection for the Caixabank Tech dataset.
import argparse
import json
from collections import Counter
from pathlib import Path
import numpy as np
import pandas as pd

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
DEFAULT_CHUNKSIZE = 1_000_000


def section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def null_report(df):
    n = len(df)
    nulls = df.isna().sum()
    pct = (nulls / n * 100).round(2)
    print(pd.DataFrame({"nulls": nulls, "pct": pct}).to_string())


def duplicate_report(df, id_col="id"):
    full_dupes = df.duplicated().sum()
    print(f"Full-row duplicates: {full_dupes}")
    if id_col in df.columns:
        id_dupes = df[id_col].duplicated().sum()
        print(f"Duplicate '{id_col}' values: {id_dupes}")


def inspect_small_csv(path, name):
    section(f"{name}  ({path.name})")
    df = pd.read_csv(path)
    print(f"Rows: {len(df):,}")
    print(f"Columns: {list(df.columns)}")
    print("\nDtypes:")
    print(df.dtypes.to_string())
    print("\nNull %:")
    null_report(df)
    print()
    duplicate_report(df)
    return df


def inspect_mcc(path):
    section(f"mcc_codes  ({path.name})")
    with open(path) as f:
        mcc = json.load(f)
    print(f"Codes: {len(mcc):,}")
    descriptions = list(mcc.values())
    dupe_desc = len(descriptions) - len(set(descriptions))
    print(f"Unique descriptions: {len(set(descriptions)):,}")
    if dupe_desc:
        print(f"NOTE: {dupe_desc} codes share a description with another code")
    print(f"Sample: {dict(list(mcc.items())[:3])}")
    return {int(k): v for k, v in mcc.items()}


def inspect_fraud_labels(path):
    section(f"train_fraud_labels  ({path.name})")
    with open(path) as f:
        raw = json.load(f)
    target = raw["target"]
    print(f"Labeled transactions: {len(target):,}")
    counts = Counter(target.values())
    print(f"Label values: {dict(counts)}")
    unexpected = set(counts) - {"Yes", "No"}
    if unexpected:
        print(f"NOTE: unexpected label values found: {unexpected}")
    fraud_rate = counts.get("Yes", 0) / len(target) * 100
    print(f"Fraud rate among labeled transactions: {fraud_rate:.3f}%")
    return {int(k): v for k, v in target.items()}


def inspect_transactions(path, card_ids, user_ids, mcc_code_values, card_to_client, chunksize):
    section(f"transactions  ({path.name})")
    print("Note: 'amount' is stored as a string with a '$' prefix (e.g. \"$14.57\", \"$-77.00\");")
    print("cleaned to float64 below for analysis.\n")

    dtype = {
        "id": "int64",
        "client_id": "int32",
        "card_id": "int32",
        "use_chip": "category",
        "merchant_id": "int64",
        "merchant_city": "category",
        "merchant_state": "category",
        "zip": "float64",
        "mcc": "int32",
        "errors": "category",
    }

    total_rows = 0
    null_counts = None
    first_chunk_dtypes = None
    id_arrays = []
    hash_arrays = []
    min_date, max_date = None, None
    year_counts = Counter()
    amount_neg = amount_zero = amount_pos = 0
    amount_min, amount_max = float("inf"), float("-inf")
    unmatched_card = unmatched_user = unmatched_mcc = 0
    example_unmatched_card, example_unmatched_user, example_unmatched_mcc = set(), set(), set()
    card_client_mismatch = 0

    reader = pd.read_csv(path, dtype=dtype, chunksize=chunksize)

    for chunk in reader:
        total_rows += len(chunk)

        amt = chunk["amount"].str.replace("$", "", regex=False).str.replace(",", "", regex=False).astype("float64")
        chunk["amount"] = amt

        if first_chunk_dtypes is None:
            first_chunk_dtypes = chunk.dtypes

        chunk_nulls = chunk.isna().sum()
        null_counts = chunk_nulls if null_counts is None else null_counts + chunk_nulls

        chunk_min, chunk_max = chunk["date"].min(), chunk["date"].max()
        min_date = chunk_min if min_date is None else min(min_date, chunk_min)
        max_date = chunk_max if max_date is None else max(max_date, chunk_max)
        year_counts.update(chunk["date"].str[:4].value_counts().to_dict())

        amount_neg += int((amt < 0).sum())
        amount_zero += int((amt == 0).sum())
        amount_pos += int((amt > 0).sum())
        amount_min = min(amount_min, amt.min())
        amount_max = max(amount_max, amt.max())

        id_arrays.append(chunk["id"].to_numpy())
        dupe_key = chunk[["client_id", "card_id", "date", "merchant_id"]].assign(amount=amt)
        hash_arrays.append(pd.util.hash_pandas_object(dupe_key, index=False).to_numpy())

        card_match = chunk["card_id"].isin(card_ids)
        user_match = chunk["client_id"].isin(user_ids)
        mcc_match = chunk["mcc"].isin(mcc_code_values)
        unmatched_card += int((~card_match).sum())
        unmatched_user += int((~user_match).sum())
        unmatched_mcc += int((~mcc_match).sum())
        if len(example_unmatched_card) < 5:
            example_unmatched_card.update(chunk.loc[~card_match, "card_id"].unique()[:5].tolist())
        if len(example_unmatched_user) < 5:
            example_unmatched_user.update(chunk.loc[~user_match, "client_id"].unique()[:5].tolist())
        if len(example_unmatched_mcc) < 5:
            example_unmatched_mcc.update(chunk.loc[~mcc_match, "mcc"].unique()[:5].tolist())

        mapped_client = chunk["card_id"].map(card_to_client)
        checkable = card_match & mapped_client.notna()
        card_client_mismatch += int((checkable & (mapped_client != chunk["client_id"])).sum())

    ids = np.concatenate(id_arrays)
    hashes = np.concatenate(hash_arrays)
    dup_id_count = total_rows - len(np.unique(ids))
    _, hash_counts = np.unique(hashes, return_counts=True)
    candidate_dupe_rows = int(hash_counts[hash_counts > 1].sum())

    print(f"Rows (streamed): {total_rows:,}")
    print(f"Columns: {list(first_chunk_dtypes.index)}")
    print("\nDtypes (post-cleaning):")
    print(first_chunk_dtypes.to_string())

    print("\nNull %:")
    null_pct = (null_counts / total_rows * 100).round(2)
    print(pd.DataFrame({"nulls": null_counts, "pct": null_pct}).to_string())

    print(f"\nDuplicate 'id' values: {dup_id_count}")
    print(f"Candidate duplicate transactions (same client_id+card_id+date+merchant_id+amount, different id): {candidate_dupe_rows}")
    print("  (hash-based match; collision false-positives are astronomically unlikely)")

    print(f"\nAmount: min={amount_min:.2f}  max={amount_max:.2f}")
    print(f"  negative: {amount_neg:,} ({amount_neg / total_rows * 100:.2f}%)")
    print(f"  zero:     {amount_zero:,} ({amount_zero / total_rows * 100:.2f}%)")
    print(f"  positive: {amount_pos:,} ({amount_pos / total_rows * 100:.2f}%)")

    print(f"\nDate range: {min_date}  to  {max_date}")
    print("Transactions per year:")
    for year in sorted(year_counts):
        print(f"  {year}: {year_counts[year]:,}")

    print("\nFK check -- card_id -> cards.id:")
    print(f"  unmatched: {unmatched_card:,} ({unmatched_card / total_rows * 100:.4f}%)")
    if example_unmatched_card:
        print(f"  example unmatched card_id values: {sorted(example_unmatched_card)[:5]}")

    print("\nFK check -- client_id -> users.id:")
    print(f"  unmatched: {unmatched_user:,} ({unmatched_user / total_rows * 100:.4f}%)")
    if example_unmatched_user:
        print(f"  example unmatched client_id values: {sorted(example_unmatched_user)[:5]}")

    print("\nFK check -- mcc -> mcc_codes:")
    print(f"  unmatched: {unmatched_mcc:,} ({unmatched_mcc / total_rows * 100:.4f}%)")
    if example_unmatched_mcc:
        print(f"  example unmatched mcc values: {sorted(example_unmatched_mcc)[:5]}")

    print("\nBonus check -- transactions.client_id vs cards_data.client_id (via card_id):")
    print(f"  mismatches: {card_client_mismatch:,} ({card_client_mismatch / total_rows * 100:.4f}%)")

    return ids, total_rows


def check_fraud_label_coverage(fraud_labels, transaction_ids, total_transactions):
    section("Cross-check: fraud labels vs transactions")
    fraud_ids = np.array(list(fraud_labels.keys()))
    matched = np.isin(fraud_ids, transaction_ids)
    unmatched = int((~matched).sum())
    print(f"Fraud-labeled transaction_ids with no matching transaction: {unmatched:,}")
    coverage = len(fraud_ids) / total_transactions * 100
    print(f"Fraud label coverage: {len(fraud_ids):,} / {total_transactions:,} transactions ({coverage:.2f}%)")


def main():
    parser = argparse.ArgumentParser(description="Phase 1 data inspection for the Caixabank Tech dataset")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--chunksize", type=int, default=DEFAULT_CHUNKSIZE)
    args = parser.parse_args()

    users_df = inspect_small_csv(args.data_dir / "users_data.csv", "users")
    cards_df = inspect_small_csv(args.data_dir / "cards_data.csv", "cards")
    mcc_codes = inspect_mcc(args.data_dir / "mcc_codes.json")
    fraud_labels = inspect_fraud_labels(args.data_dir / "train_fraud_labels.json")

    card_to_client = dict(zip(cards_df["id"], cards_df["client_id"]))

    transaction_ids, total_transactions = inspect_transactions(
        args.data_dir / "transactions_data.csv",
        card_ids=cards_df["id"].to_numpy(),
        user_ids=users_df["id"].to_numpy(),
        mcc_code_values=np.array(list(mcc_codes.keys())),
        card_to_client=card_to_client,
        chunksize=args.chunksize,
    )

    check_fraud_label_coverage(fraud_labels, transaction_ids, total_transactions)

    section("Done")


if __name__ == "__main__":
    main()
