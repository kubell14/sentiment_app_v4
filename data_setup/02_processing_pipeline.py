from __future__ import annotations

import os
import sys

# Add project root to path so `src` package is importable
sys.path.insert(0, "/Workspace/Users/kaley.ubellacker@avant.com/sentiment_app_v2-main (2)")

from src.common.scoring import normalize_sentiment

from pyspark.sql import SparkSession, functions as F
from pyspark.sql.types import DoubleType, StringType, ArrayType

spark = SparkSession.builder.getOrCreate()


CATALOG = "avant_users"
SCHEMA = "kaley_ubellacker"
BRONZE = f"{CATALOG}.{SCHEMA}.trustpilot_reviews_bronze"
SILVER = f"{CATALOG}.{SCHEMA}.trustpilot_reviews_silver"
GOLD = f"{CATALOG}.{SCHEMA}.trustpilot_sentiment_gold"
VALIDATION = f"{CATALOG}.{SCHEMA}.trustpilot_pipeline_validation"

NEGATIVE_TERMS = ["declined", "unhelpful", "rude", "harassment", "scam", "hidden", "terrible", "cancel", "angry", "frustrat"]
CHURN_TERMS = ["close", "cancel", "switch", "leave", "never again", "done with", "complaint", "regret"]

@F.udf(returnType=DoubleType())
def sentiment_from_rating(rating: int) -> float:
    if rating is None:
        return 0.0
    return (float(rating) - 3.0) / 2.0

@F.udf(returnType=DoubleType())
def normalize_udf(x: float) -> float:
    return normalize_sentiment(x)

@F.udf(returnType=StringType())
def infer_primary_category(text: str) -> str:
    if not text:
        return "other"
    t = text.lower()
    rules = [
        ("collections", ["collection", "harass", "late call"]),
        ("fees", ["fee", "maintenance fee", "annual fee"]),
        ("apr_interest", ["apr", "interest", "rate"]),
        ("customer_service", ["customer service", "agent", "representative"]),
        ("fraud_security", ["fraud", "security", "stolen"]),
        ("payment_processing", ["payment", "autopay", "post"]),
        ("account_access", ["login", "app", "access", "locked"]),
        ("credit_line_increases", ["credit line", "increase", "limit"]),
        ("transparency", ["hidden", "disclose", "transparent", "confusing"]),
        ("rewards_value", ["reward", "cashback", "points", "value"]),
    ]
    for category, kws in rules:
        if any(k in t for k in kws):
            return category
    
    return "other"

bronze_df = spark.table(BRONZE)
text_col = F.coalesce(F.col("text"), F.lit(""))
lower_text = F.lower(text_col)

neg_hits = sum([F.when(lower_text.contains(t), 1).otherwise(0) for t in NEGATIVE_TERMS])
churn_hits = sum([F.when(lower_text.contains(t), 1).otherwise(0) for t in CHURN_TERMS])

silver_df = (
    bronze_df
    .withColumn("sentiment_raw", sentiment_from_rating(F.col("rating")))
    .withColumn("sentiment_score", normalize_udf(F.col("sentiment_raw")))
    .withColumn("primary_category", infer_primary_category(text_col))
    .withColumn("negative_term_hits", neg_hits)
    .withColumn("churn_term_hits", churn_hits)
    .withColumn("severity_score", F.least(F.lit(100.0),
        F.lit(20.0)
        + (F.when(F.col("rating") <= 2, 45).when(F.col("rating") == 3, 20).otherwise(0))
        + F.col("negative_term_hits") * F.lit(8.0)
        + F.when(F.col("primary_category").isin("collections", "fees", "transparency"), 12).otherwise(0)
    ))
    .withColumn("churn_risk_score", F.least(F.lit(100.0),
        F.lit(10.0)
        + (F.when(F.col("rating") <= 2, 35).when(F.col("rating") == 3, 15).otherwise(0))
        + F.col("churn_term_hits") * F.lit(12.0)
        + F.when(F.col("primary_category").isin("fees", "collections", "customer_service", "account_access"), 15).otherwise(0)
        + F.when(F.col("sentiment_score") < 35, 15).when(F.col("sentiment_score") < 50, 8).otherwise(0)
    ))
)

silver_df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(SILVER)

kpi_df = (
    silver_df.groupBy("company", "primary_category")
    .agg(
        F.count("*").alias("review_count"),
        F.avg("sentiment_score").alias("avg_sentiment_score"),
        F.avg("severity_score").alias("avg_severity_score"),
        F.avg("churn_risk_score").alias("avg_churn_risk_score"),
    )
)

peer_df = kpi_df.groupBy("primary_category").agg(F.avg("avg_sentiment_score").alias("peer_avg_sentiment"))

gold_df = (
    kpi_df.join(peer_df, on="primary_category", how="left")
    .withColumn("competitive_sentiment_index", F.col("avg_sentiment_score") - F.col("peer_avg_sentiment"))
    .withColumn("etl_run_ts", F.current_timestamp())
)

gold_df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(GOLD)

validation_df = spark.createDataFrame([
    ("silver_row_count", float(silver_df.count()), "must be > 0"),
    ("gold_row_count", float(gold_df.count()), "must be > 0"),
    ("silver_null_text_pct", float(silver_df.filter(F.col("text").isNull()).count()) / max(silver_df.count(), 1), "monitor"),
    ("silver_churn_distinct", float(silver_df.select("churn_risk_score").distinct().count()), "must be > 5"),
    ("silver_severity_distinct", float(silver_df.select("severity_score").distinct().count()), "must be > 5"),
], ["check_name", "metric_value", "rule"])
validation_df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(VALIDATION)

spark.sql(f"OPTIMIZE {SILVER}")
spark.sql(f"OPTIMIZE {GOLD}")
print("Processing pipeline completed with validation table:", VALIDATION)
