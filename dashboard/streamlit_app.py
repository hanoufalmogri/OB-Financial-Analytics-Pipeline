import os

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()


@st.cache_resource
def get_engine():
    # Deployed on Streamlit Cloud: value comes from that app's Secrets (never in the repo).
    # Running locally: value comes from .env via load_dotenv() above.
    try:
        database_url = st.secrets["DATABASE_URL"]
    except (KeyError, FileNotFoundError):
        database_url = os.environ["DATABASE_URL"]
    return create_engine(database_url)


@st.cache_data(ttl=600)
def load_cashflow_trend():
    query = """
        select
            month,
            sum(total_outflow) as total_outflow,
            sum(total_inflow) as total_inflow
        from public_marts.fct_cashflow_summary
        group by month
        order by month
    """
    return pd.read_sql(query, get_engine())


@st.cache_data(ttl=600)
def load_spending_by_category():
    query = """
        with bounds as (
            select
                max(month) as current_month,
                max(month) - interval '1 month' as prior_month
            from public_analytics.spending_by_category
        )
        select
            s.mcc_category,
            sum(case when s.month = b.current_month then s.total_spent else 0 end) as current_month_spend,
            sum(case when s.month = b.prior_month then s.total_spent else 0 end) as prior_month_spend,
            max(b.current_month) as current_month,
            max(b.prior_month) as prior_month
        from public_analytics.spending_by_category s
        cross join bounds b
        where s.month in (b.current_month, b.prior_month)
        group by s.mcc_category
        order by current_month_spend desc
    """
    return pd.read_sql(query, get_engine())


@st.cache_data(ttl=600)
def load_recurring_payments():
    query = """
        select
            card_id, merchant_id, typical_amount, detected_frequency,
            occurrence_count, first_occurrence, last_occurrence
        from public_analytics.recurring_payments
        order by occurrence_count desc, typical_amount desc
    """
    return pd.read_sql(query, get_engine())


@st.cache_data(ttl=600)
def load_health_scores():
    query = """
        select
            user_id, savings_rate, spending_volatility, debt_to_income,
            savings_rate_percentile, spending_stability_percentile,
            debt_to_income_percentile, health_score_percentile
        from public_analytics.health_score
        order by user_id
    """
    return pd.read_sql(query, get_engine())


st.set_page_config(page_title="Open Banking Financial Analytics", layout="wide")
st.title("Open Banking Financial Analytics Dashboard")
st.caption(
    "Built on the Caixabank Tech dataset (2024 AI Hackathon), scoped to 2017-2018. "
    "Illustrative data for a portfolio project -- not real Malaa or real user data."
)
st.info(
    "First load can take a minute or two -- the database wakes from an idle, serverless state "
    "and each panel queries it separately. Results are then cached for 10 minutes.",
    icon="ℹ️",
)

tab_cashflow, tab_category, tab_recurring, tab_health = st.tabs(
    ["Cash Flow Trend", "Spending by Category", "Recurring Payments", "Health Score"]
)

with tab_cashflow:
    st.header("Cash Flow Trend")
    st.caption(
        "Total outflow (spending) vs. total inflow (refunds/credits), summed across all users, per month."
    )
    cashflow_df = load_cashflow_trend()
    st.line_chart(cashflow_df.set_index("month")[["total_outflow", "total_inflow"]])

with tab_category:
    st.header("Spending by Category")
    category_df = load_spending_by_category()
    current_month = pd.to_datetime(category_df["current_month"].iloc[0]).strftime("%B %Y")
    prior_month = pd.to_datetime(category_df["prior_month"].iloc[0]).strftime("%B %Y")
    st.caption(
        f"{current_month} vs. {prior_month}, summed across all users. Top 15 categories by current-month spend."
    )
    top_categories = category_df.head(15).set_index("mcc_category")
    st.bar_chart(top_categories[["current_month_spend", "prior_month_spend"]])
    with st.expander("See all categories"):
        st.dataframe(category_df.drop(columns=["current_month", "prior_month"]), width="stretch")

with tab_recurring:
    st.header("Recurring Payments")
    st.warning(
        "These are **low-confidence candidates**, not a confirmed subscription list. "
        "Detection is based purely on matching card + merchant + similar amount + regular interval, "
        "with no merchant name data available to corroborate the match -- see docs/scope-decision.md "
        "for the full limitation."
    )
    recurring_df = load_recurring_payments()
    st.dataframe(recurring_df, width="stretch")

with tab_health:
    st.header("Financial Health Score")
    st.caption(
        "Percentile-based score combining savings rate, spending stability, and debt-to-income -- "
        "relative standing against the user population, not an absolute grade. Only users with at "
        "least one 2017-2018 transaction have a score."
    )
    health_df = load_health_scores()

    st.subheader("Distribution across all users")
    bucket_labels = [f"{b}-{b + 10}" for b in range(0, 100, 10)]
    buckets = pd.cut(
        health_df["health_score_percentile"], bins=range(0, 101, 10), labels=bucket_labels, include_lowest=True
    )
    bucket_counts = buckets.value_counts().reindex(bucket_labels)
    st.bar_chart(bucket_counts)

    st.subheader("Look up a user")
    selected_user = st.selectbox("User ID", health_df["user_id"])
    row = health_df[health_df["user_id"] == selected_user].iloc[0]
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Health Score Percentile", f"{row['health_score_percentile']:.1f}")
    col2.metric("Savings Rate Percentile", f"{row['savings_rate_percentile']:.1f}")
    col3.metric("Spending Stability Percentile", f"{row['spending_stability_percentile']:.1f}")
    col4.metric("Debt-to-Income Percentile", f"{row['debt_to_income_percentile']:.1f}")
