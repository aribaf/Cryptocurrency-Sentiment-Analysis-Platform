# twitter_charts.py
import pandas as pd
import matplotlib.pyplot as plt

RAW_CSV = "crypto_tweets_db.latest_tweets.csv"


AGG_CSV = "crypto_tweets_db.sentiment_trends_agg.csv"

# -----------------------------
# Load & clean data
# -----------------------------
def load_raw(path=RAW_CSV):
    df = pd.read_csv(path)

    # Rename Mongo-style nested fields if needed
    rename_map = {
        "sentiment.label": "sentiment_label",
        "sentiment.scores.positive": "sent_pos",
        "sentiment.scores.negative": "sent_neg",
        "sentiment.scores.neutral": "sent_neu",
        "sentiment.score_weighted": "score_weighted",
        "sentiment.confidence": "sent_confidence",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    # Parse datetime
    if "scraped_at" in df.columns:
        df["scraped_at"] = pd.to_datetime(df["scraped_at"], errors="coerce")
    elif "created_at" in df.columns:
        df["scraped_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    else:
        raise ValueError("No scraped_at or created_at column found in raw CSV")

    return df


def load_agg(path=AGG_CSV):
    df = pd.read_csv(path)
    if "time_bucket" not in df.columns:
        raise ValueError("Aggregation CSV must contain time_bucket column")
    df["time_bucket"] = pd.to_datetime(df["time_bucket"], errors="coerce")
    return df

# -----------------------------
# 1) Sentiment over time (agg)
# -----------------------------
def plot_sentiment_trend(agg_df, unit="day"):
    df = agg_df.copy()
    df = df[df["unit"] == unit]

    plt.figure(figsize=(10, 5))
    for coin, sub in df.groupby("coin"):
        sub = sub.sort_values("time_bucket")
        plt.plot(sub["time_bucket"], sub["score"], marker="o", label=coin)

    plt.axhline(0, linestyle="--")
    plt.title(f"Average Sentiment Score Over Time ({unit})")
    plt.xlabel("Time")
    plt.ylabel("Score (avg_pos - avg_neg)")
    plt.legend()
    plt.tight_layout()
    plt.show()

# -----------------------------
# 2) Tweet volume over time
# -----------------------------
def plot_tweet_volume(agg_df, unit="day"):
    df = agg_df.copy()
    df = df[df["unit"] == unit]

    plt.figure(figsize=(10, 5))
    for coin, sub in df.groupby("coin"):
        sub = sub.sort_values("time_bucket")
        plt.plot(sub["time_bucket"], sub["tweet_count"], marker="o", label=coin)

    plt.title(f"Tweet Volume Over Time ({unit})")
    plt.xlabel("Time")
    plt.ylabel("Tweet Count")
    plt.legend()
    plt.tight_layout()
    plt.show()

# -----------------------------
# 3) Weighted vs unweighted
# -----------------------------
def plot_weighted_vs_unweighted(agg_df, unit="day"):
    df = agg_df.copy()
    df = df[df["unit"] == unit]

    plt.figure(figsize=(10, 5))
    for coin, sub in df.groupby("coin"):
        sub = sub.sort_values("time_bucket")
        plt.plot(sub["time_bucket"], sub["score"], linestyle="-", label=f"{coin} - unweighted")
        plt.plot(sub["time_bucket"], sub["score_weighted"], linestyle="--", label=f"{coin} - weighted")

    plt.axhline(0, linestyle=":")
    plt.title(f"Weighted vs Unweighted Sentiment ({unit})")
    plt.xlabel("Time")
    plt.ylabel("Score")
    plt.legend()
    plt.tight_layout()
    plt.show()

# -----------------------------
# 4) Avg sentiment per coin
# -----------------------------
def plot_avg_sentiment_per_coin(agg_df, unit="day", last_n=30):
    df = agg_df.copy()
    df = df[df["unit"] == unit]
    if df.empty:
        print("No aggregation data for unit =", unit)
        return

    # Filter to last N days/weeks
    max_time = df["time_bucket"].max()
    if pd.isna(max_time):
        print("No valid time_bucket values.")
        return

    min_time = max_time - pd.Timedelta(days=last_n)
    df = df[df["time_bucket"] >= min_time]

    grouped = df.groupby("coin").agg(
        avg_score=("score", "mean"),
        avg_score_weighted=("score_weighted", "mean"),
    ).reset_index()

    x = range(len(grouped))
    width = 0.35

    plt.figure(figsize=(8, 5))
    plt.bar([i - width / 2 for i in x], grouped["avg_score"], width=width, label="Unweighted")
    plt.bar([i + width / 2 for i in x], grouped["avg_score_weighted"], width=width, label="Weighted")
    plt.xticks(x, grouped["coin"])
    plt.axhline(0, linestyle="--")
    plt.title(f"Average Sentiment per Coin (last {last_n} days of {unit}-level data)")
    plt.ylabel("Average Score")
    plt.legend()
    plt.tight_layout()
    plt.show()

# -----------------------------
# 5) Sentiment label distribution
# -----------------------------
def plot_label_distribution(raw_df):
    if "sentiment_label" not in raw_df.columns:
        raise ValueError("Raw CSV needs a 'sentiment_label' column (e.g. sentiment.label)")

    counts = raw_df.groupby(["coin", "sentiment_label"]).size().reset_index(name="count")
    coins = counts["coin"].unique()
    labels = counts["sentiment_label"].unique()

    # Pivot to coin x label
    pivot = counts.pivot(index="coin", columns="sentiment_label", values="count").fillna(0)
    pivot = pivot[sorted(pivot.columns)]  # sort labels

    x = range(len(pivot.index))

    plt.figure(figsize=(10, 6))
    bottom = [0] * len(pivot.index)
    for label in pivot.columns:
        vals = pivot[label].values
        plt.bar(x, vals, bottom=bottom, label=label)
        bottom = bottom + vals

    plt.xticks(x, pivot.index)
    plt.title("Sentiment Label Distribution per Coin")
    plt.ylabel("Tweet Count")
    plt.legend(title="Label")
    plt.tight_layout()
    plt.show()

# -----------------------------
# 6) Confidence histogram
# -----------------------------
def plot_confidence_hist(raw_df):
    if "sent_confidence" not in raw_df.columns:
        raise ValueError("Raw CSV needs 'sent_confidence' column (e.g. sentiment.confidence)")

    plt.figure(figsize=(8, 5))
    raw_df["sent_confidence"].plot(kind="hist", bins=20)
    plt.title("Sentiment Model Confidence Distribution")
    plt.xlabel("Confidence")
    plt.ylabel("Frequency")
    plt.tight_layout()
    plt.show()

# -----------------------------
# 7) Weighted score distribution
# -----------------------------
def plot_score_weighted_hist(raw_df):
    if "score_weighted" not in raw_df.columns:
        raise ValueError("Raw CSV needs 'score_weighted' column (e.g. sentiment.score_weighted)")

    plt.figure(figsize=(8, 5))
    raw_df["score_weighted"].plot(kind="hist", bins=30)
    plt.title("Weighted Sentiment Score Distribution")
    plt.xlabel("Weighted Score")
    plt.ylabel("Frequency")
    plt.tight_layout()
    plt.show()

# -----------------------------
# 8) Followers vs weighted score
# -----------------------------
def plot_followers_vs_score(raw_df, max_followers=200_000):
    # Clean cols
    if "user_followers" not in raw_df.columns:
        print("user_followers column not found; skipping followers vs score plot.")
        return
    if "score_weighted" not in raw_df.columns:
        print("score_weighted column not found; skipping followers vs score plot.")
        return

    df = raw_df.copy()
    df = df[(df["user_followers"] >= 0) & (df["user_followers"] <= max_followers)]
    df = df.dropna(subset=["score_weighted"])

    plt.figure(figsize=(8, 5))
    plt.scatter(df["user_followers"], df["score_weighted"], alpha=0.4)
    plt.xscale("log")
    plt.title("Followers vs Weighted Sentiment Score")
    plt.xlabel("Followers (log scale)")
    plt.ylabel("Weighted Score")
    plt.tight_layout()
    plt.show()

# -----------------------------
# Run all charts
# -----------------------------
def run_all():
    raw_df = load_raw()
    agg_df = load_agg()

    print("Plotting time-series charts...")
    plot_sentiment_trend(agg_df, unit="day")
    plot_tweet_volume(agg_df, unit="day")
    plot_weighted_vs_unweighted(agg_df, unit="day")
    plot_avg_sentiment_per_coin(agg_df, unit="day", last_n=30)

    print("Plotting tweet-level charts...")
    plot_label_distribution(raw_df)
    plot_confidence_hist(raw_df)
    plot_score_weighted_hist(raw_df)
    plot_followers_vs_score(raw_df)

if __name__ == "__main__":
    run_all()
