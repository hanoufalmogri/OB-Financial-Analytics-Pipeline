#!/usr/bin/env python3
# Phase 3 bronze-layer ingestion: raw files -> raw Postgres tables on Neon, unmodified.
# Usage: python ingestion/load_bronze.py
import csv
import json
import os
import sys
import tempfile
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data" / "raw"

TX_DATE_MIN = "2017-01-01 00:00:00"
TX_DATE_MAX_EXCLUSIVE = "2019-01-01 00:00:00"

EXPECTED_COUNTS = {
    "raw_users": 2_000,
    "raw_cards": 6_146,
}
EXPECTED_TRANSACTIONS = 2_794_100  # 2017: 1,399,308 + 2018: 1,394,792, 


def get_connection():
    load_dotenv(REPO_ROOT / ".env")
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    return conn


def quote_ident(name):
    return '"' + name.replace('"', '""') + '"'


def drop_table_if_exists(conn, table_name):
    cur = conn.cursor()
    cur.execute(f"DROP TABLE IF EXISTS {quote_ident(table_name)}")
    cur.close()


def create_text_table(cur, table_name, columns):
    cur.execute(f"DROP TABLE IF EXISTS {quote_ident(table_name)}")
    cols_sql = ", ".join(f"{quote_ident(c)} TEXT" for c in columns)
    cur.execute(f"CREATE TABLE {quote_ident(table_name)} ({cols_sql})")


def copy_from_file(cur, table_name, file_obj, columns):
    col_list = ", ".join(quote_ident(c) for c in columns)
    cur.copy_expert(
        f"COPY {quote_ident(table_name)} ({col_list}) FROM STDIN WITH (FORMAT csv, HEADER true)",
        file_obj,
    )


def load_csv_unfiltered(conn, table_name, csv_path):
    with open(csv_path, newline="") as f:
        header = next(csv.reader(f))
    cur = conn.cursor()
    create_text_table(cur, table_name, header)
    with open(csv_path, newline="") as f:
        copy_from_file(cur, table_name, f, header)
    cur.execute(f"SELECT COUNT(*) FROM {quote_ident(table_name)}")
    count = cur.fetchone()[0]
    cur.close()
    return count


def load_transactions_filtered(conn, csv_path, date_col="date", id_col="id"):
    with open(csv_path, newline="") as f:
        header = next(csv.reader(f))
    date_idx = header.index(date_col)
    id_idx = header.index(id_col)

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="")
    writer = csv.writer(tmp)
    writer.writerow(header)
    kept = 0
    first_kept_row = None
    last_kept_row = None
    kept_ids = set()
    with open(csv_path, newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if TX_DATE_MIN <= row[date_idx] < TX_DATE_MAX_EXCLUSIVE:
                writer.writerow(row)
                kept += 1
                kept_ids.add(int(row[id_idx]))
                if first_kept_row is None:
                    first_kept_row = dict(zip(header, row))
                last_kept_row = dict(zip(header, row))
    tmp.close()

    cur = conn.cursor()
    create_text_table(cur, "raw_transactions", header)
    with open(tmp.name, newline="") as f:
        copy_from_file(cur, "raw_transactions", f, header)
    os.unlink(tmp.name)

    cur.execute("SELECT COUNT(*) FROM raw_transactions")
    count = cur.fetchone()[0]
    cur.execute("SELECT MIN(date), MAX(date) FROM raw_transactions")
    min_date, max_date = cur.fetchone()
    cur.close()
    return kept, count, first_kept_row, last_kept_row, min_date, max_date, kept_ids


def load_mcc_codes(conn, json_path):
    with open(json_path) as f:
        mcc = json.load(f)
    columns = ["mcc_code", "category_description"]
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="")
    writer = csv.writer(tmp)
    writer.writerow(columns)
    for code, desc in mcc.items():
        writer.writerow([code, desc])
    tmp.close()

    cur = conn.cursor()
    create_text_table(cur, "raw_mcc_codes", columns)
    with open(tmp.name, newline="") as f:
        copy_from_file(cur, "raw_mcc_codes", f, columns)
    os.unlink(tmp.name)

    cur.execute("SELECT COUNT(*) FROM raw_mcc_codes")
    count = cur.fetchone()[0]
    cur.close()
    return len(mcc), count


def load_fraud_labels(conn, json_path, keep_ids):
    with open(json_path) as f:
        raw = json.load(f)
    target = raw["target"]
    total_source = len(target)
    columns = ["transaction_id", "is_fraud"]
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="")
    writer = csv.writer(tmp)
    writer.writerow(columns)
    samples = []
    kept = 0
    for txn_id, label in target.items():
        if int(txn_id) in keep_ids:
            writer.writerow([txn_id, label])
            kept += 1
            if len(samples) < 2:
                samples.append({"transaction_id": txn_id, "is_fraud": label})
    tmp.close()

    cur = conn.cursor()
    create_text_table(cur, "raw_fraud_labels", columns)
    with open(tmp.name, newline="") as f:
        copy_from_file(cur, "raw_fraud_labels", f, columns)
    os.unlink(tmp.name)

    cur.execute("SELECT COUNT(*) FROM raw_fraud_labels")
    count = cur.fetchone()[0]
    cur.close()
    return total_source, kept, count, samples


def spot_check_row_dict(conn, table_name, key_col, source_row):
    key = source_row[key_col]
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {quote_ident(table_name)} WHERE {quote_ident(key_col)} = %s", (key,))
    col_names = [d[0] for d in cur.description]
    db_row = dict(zip(col_names, cur.fetchone()))
    mismatches = [c for c in col_names if source_row[c] != ("" if db_row[c] is None else db_row[c])]
    print(f"  [{'OK' if not mismatches else 'MISMATCH'}] {table_name}.{key_col}={key}")
    for c in mismatches:
        print(f"    {c}: source={source_row[c]!r}  db={db_row[c]!r}")
    cur.close()
    return not mismatches


def spot_check_csv_table(conn, table_name, csv_path, key_col, keys_to_check):
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        source_rows = {row[key_col]: row for row in reader if row[key_col] in keys_to_check}
    return all(spot_check_row_dict(conn, table_name, key_col, source_rows[k]) for k in keys_to_check)


def spot_check_mcc(conn, json_path, keys_to_check):
    with open(json_path) as f:
        mcc = json.load(f)
    samples = [{"mcc_code": k, "category_description": mcc[k]} for k in keys_to_check]
    return all(spot_check_row_dict(conn, "raw_mcc_codes", "mcc_code", s) for s in samples)


def main():
    conn = get_connection()
    print(f"Expected raw_transactions count (2017-2018): {EXPECTED_TRANSACTIONS:,}\n")

    print("Dropping any existing raw_fraud_labels (frees space before the transactions load)...")
    drop_table_if_exists(conn, "raw_fraud_labels")

    print("raw_users ...")
    n = load_csv_unfiltered(conn, "raw_users", DATA_DIR / "users_data.csv")
    print(f"  loaded: {n:,}  (expected {EXPECTED_COUNTS['raw_users']:,})")
    assert n == EXPECTED_COUNTS["raw_users"]

    print("raw_cards ...")
    n = load_csv_unfiltered(conn, "raw_cards", DATA_DIR / "cards_data.csv")
    print(f"  loaded: {n:,}  (expected {EXPECTED_COUNTS['raw_cards']:,})")
    assert n == EXPECTED_COUNTS["raw_cards"]

    print("raw_mcc_codes ...")
    expected, n = load_mcc_codes(conn, DATA_DIR / "mcc_codes.json")
    print(f"  loaded: {n:,}  (expected {expected:,})")
    assert n == expected

    print("raw_transactions (streaming + filtering to 2017-2018) ...")
    kept, n, first_row, last_row, min_date, max_date, kept_ids = load_transactions_filtered(
        conn, DATA_DIR / "transactions_data.csv"
    )
    print(f"  rows matching filter while streaming: {kept:,}")
    print(f"  loaded into Postgres: {n:,}")
    print(f"  date range in table: {min_date} to {max_date}")
    assert kept == n, "streamed filter count and loaded count disagree"
    assert n == EXPECTED_TRANSACTIONS, f"loaded {n:,}, pre-stated expectation was {EXPECTED_TRANSACTIONS:,}"
    assert min_date >= TX_DATE_MIN and max_date < TX_DATE_MAX_EXCLUSIVE, "date range escaped the filter bounds"

    print("\nraw_transactions row count: verified.\n")

    print("raw_fraud_labels (filtered to transaction_ids present in raw_transactions) ...")
    total_source, kept_labels, n, fraud_samples = load_fraud_labels(
        conn, DATA_DIR / "train_fraud_labels.json", kept_ids
    )
    print(f"  source labels (all years, unfiltered): {total_source:,}")
    print(f"  labels matching a 2017-2018 transaction_id: {kept_labels:,}")
    print(f"  loaded into Postgres: {n:,}")
    assert n == kept_labels, "filtered count and loaded count disagree"

    print("\nSpot-checking sample rows against source files...")
    all_ok = True
    all_ok &= spot_check_csv_table(conn, "raw_users", DATA_DIR / "users_data.csv", "id", ["825", "1746"])
    all_ok &= spot_check_csv_table(conn, "raw_cards", DATA_DIR / "cards_data.csv", "id", ["4524", "2731"])
    all_ok &= spot_check_mcc(conn, DATA_DIR / "mcc_codes.json", ["5812", "5541"])
    all_ok &= spot_check_row_dict(conn, "raw_transactions", "id", first_row)
    all_ok &= spot_check_row_dict(conn, "raw_transactions", "id", last_row)
    for sample in fraud_samples:
        all_ok &= spot_check_row_dict(conn, "raw_fraud_labels", "transaction_id", sample)

    cur = conn.cursor()
    cur.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
    print(f"\nTotal database size: {cur.fetchone()[0]}")
    cur.close()

    conn.close()

    if all_ok:
        print("\nAll spot checks passed. Bronze ingestion complete and verified.")
    else:
        print("\nSome spot checks FAILED -- see above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
