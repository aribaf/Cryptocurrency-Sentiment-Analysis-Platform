#!/usr/bin/env python3
import pandas as pd
import matplotlib.pyplot as plt

# --------------------------
# FILE PATHS (EDIT IF NEEDED)
# --------------------------
TWITTER_CSV       = "crypto_tweets_db.latest_tweets.csv"
REDDIT_CSV        = "crypto_reddit_db.latest_reddit.csv"
NEWS_CSV          = "crypto_news_db.articles.csv"
TX_CSV            = "crypto_tweets_db.transactions.csv"
HISTORY_CSV       = "trend_prediction.history.csv"
PREDICTIONS_CSV   = "trend_prediction.predictions.csv"   # not strictly needed

# ==========================
# HELPERS
# ==========================
def load_twitter():
    df = pd.read_csv(TWITTER_CSV)

    rename_map = {
        "sentiment.label": "sentiment_label",
        "sentiment.scores.positive": "sent_pos",
        "sentiment.scores.neutral": "sent_neu",
        "sentiment.scores.negative": "sent_neg",
        "sentiment.score_weighted": "score_weighted",
        "sentiment.confidence": "sent_confidence",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    if "scraped_at" in df.columns:
        df["time"] = pd.to_datetime(df["scraped_at"], errors="coerce")
    elif "created_at" in df.columns:
        df["time"] = pd.to_datetime(df["created_at"], errors="coerce")
    else:
        raise ValueError("No scraped_at / created_at in Twitter CSV")

    # Make sure coin is in a clean format
    if "coin" not in df.columns:
        df["coin"] = "Bitcoin"   # fallback; change if needed

    return df


def load_reddit():
    df = pd.read_csv(REDDIT_CSV)

    rename_map = {
        "sentiment.polarity": "polarity",
        "sentiment.label": "sentiment_label",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    if "created_utc" in df.columns:
        df["time"] = pd.to_datetime(df["created_utc"], errors="coerce")
    elif "created_at" in df.columns:
        df["time"] = pd.to_datetime(df["created_at"], errors="coerce")

    if "coin" not in df.columns:
        df["coin"] = "UNKNOWN"

    # if polarity not present but scores are, you can subtract:
    if "polarity" not in df.columns:
        if "sent_pos" in df.columns and "sent_neg" in df.columns:
            df["polarity"] = df["sent_pos"] - df["sent_neg"]

    return df


def load_news():
    df = pd.read_csv(NEWS_CSV)

    # guess common sentiment columns
    if "sentiment.polarity" in df.columns:
        df = df.rename(columns={"sentiment.polarity": "polarity"})
    elif "sentiment_score" in df.columns:
        df = df.rename(columns={"sentiment_score": "polarity"})

    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"], errors="coerce")
    elif "published_at" in df.columns:
        df["time"] = pd.to_datetime(df["published_at"], errors="coerce")

    if "coin" not in df.columns:
        df["coin"] = "UNKNOWN"

    return df


# ==========================
# FIGURE 5.1 — BTC SENTIMENT DISTRIBUTION (TWITTER)
# ==========================
def figure_5_1_btc_sentiment_distribution():
    df = load_twitter()

    # filter last 24h
    max_time = df["time"].max()
    window_start = max_time - pd.Timedelta(hours=24)
    df_24h = df[(df["time"] >= window_start) & (df["time"] <= max_time)]

    # BTC only (adjust if you store as BTC instead of Bitcoin)
    btc = df_24h[df_24h["coin"].isin(["BTC", "Bitcoin"])]

    if "sentiment_label" not in btc.columns:
        raise ValueError("Twitter CSV must have 'sentiment.label' field exported")

    counts = btc["sentiment_label"].value_counts(normalize=True) * 100
    print("BTC 24h sentiment distribution (%):")
    print(counts)

    plt.figure(figsize=(6, 6))
    plt.pie(
        counts.values,
        labels=counts.index,
        autopct="%1.1f%%",
        startangle=90
    )
    plt.title("Figure 5.1 — Sentiment Distribution for Bitcoin (Twitter, last 24h)")
    plt.tight_layout()
    plt.show()


# ==========================
# FIGURE 5.2 — HOURLY SENTIMENT TREND FOR BTC (TWITTER)
# ==========================
def figure_5_2_btc_hourly_trend():
    df = load_twitter()
    max_time = df["time"].max()
    window_start = max_time - pd.Timedelta(hours=24)
    df_24h = df[(df["time"] >= window_start) & (df["time"] <= max_time)]

    btc = df_24h[df_24h["coin"].isin(["BTC", "Bitcoin"])].copy()

    # Build numeric polarity: positive - negative
    if "sent_pos" in btc.columns and "sent_neg" in btc.columns:
        btc["polarity"] = btc["sent_pos"] - btc["sent_neg"]
    elif "score_weighted" in btc.columns:
        btc["polarity"] = btc["score_weighted"]
    else:
        raise ValueError("Need sent_pos/sent_neg or score_weighted for Twitter BTC")

    btc["hour"] = btc["time"].dt.floor("H")
    agg = btc.groupby("hour")["polarity"].mean().reset_index()

    plt.figure(figsize=(10, 5))
    plt.plot(agg["hour"], agg["polarity"], marker="o")
    plt.axhline(0, linestyle="--")
    plt.title("Figure 5.2 — Hourly Sentiment Trend for BTC (Twitter)")
    plt.xlabel("Time (UTC, hourly buckets)")
    plt.ylabel("Average sentiment polarity")
    plt.tight_layout()
    plt.show()


# ==========================
# FIGURE 5.3 — CROSS-PLATFORM SENTIMENT COMPARISON
# ==========================
def figure_5_3_cross_platform_sentiment(coin="Bitcoin"):
    tw = load_twitter()
    rd = load_reddit()
    nw = load_news()

    # unify polarity for twitter (pos - neg)
    if "polarity" not in tw.columns:
        if "sent_pos" in tw.columns and "sent_neg" in tw.columns:
            tw["polarity"] = tw["sent_pos"] - tw["sent_neg"]
        elif "score_weighted" in tw.columns:
            tw["polarity"] = tw["score_weighted"]

    # pick one coin (BTC/Ethereum/Solana). adjust mapping if needed
    coin_variants = {
        "Bitcoin": ["Bitcoin", "BTC"],
        "Ethereum": ["Ethereum", "ETH"],
        "Solana": ["Solana", "SOL", "SOLANA"],
    }[coin]

    tw_c = tw[tw["coin"].isin(coin_variants)]
    rd_c = rd[rd["coin"].isin(coin_variants)]
    nw_c = nw[nw["coin"].isin(coin_variants)]

    means = {
        "Twitter": tw_c["polarity"].mean(),
        "Reddit": rd_c["polarity"].mean(),
        "News":   nw_c["polarity"].mean(),
    }

    platforms = list(means.keys())
    vals = [means[p] for p in platforms]

    plt.figure(figsize=(6, 5))
    plt.bar(platforms, vals)
    plt.axhline(0, linestyle="--")
    plt.title(f"Figure 5.3 — {coin}: Twitter vs Reddit vs News Sentiment")
    plt.ylabel("Average sentiment polarity")
    plt.tight_layout()
    plt.show()

    print(f"Average polarity for {coin}:")
    for p, v in means.items():
        print(f"  {p}: {v:.4f}")


# ==========================
# FIGURE 5.4 — WHALE TRANSACTIONS (COUNT & USD VALUE)
# ==========================
def figure_5_4_whale_transactions():
    df = pd.read_csv(TX_CSV)

    # ---- ASSUMED COLUMNS (edit if needed) ----
    # time column
    time_col_candidates = ["timestamp", "time", "block_time"]
    for c in time_col_candidates:
        if c in df.columns:
            df["time"] = pd.to_datetime(df[c], errors="coerce")
            break
    else:
        raise ValueError("No timestamp/time column found in transactions CSV")

    # USD value column
    usd_col_candidates = ["usd_value", "value_usd", "amount_usd"]
    for c in usd_col_candidates:
        if c in df.columns:
            usd_col = c
            break
    else:
        raise ValueError("No USD value column found in transactions CSV")

    # filter > 10k USD
    whales = df[df[usd_col] >= 10_000].copy()

    whales["hour"] = whales["time"].dt.floor("H")
    agg = whales.groupby("hour").agg(
        tx_count=(usd_col, "count"),
        total_usd=(usd_col, "sum"),
    ).reset_index()

    fig, ax1 = plt.subplots(figsize=(10, 5))

    ax1.bar(agg["hour"], agg["tx_count"], width=0.03, label="Number of whale tx")
    ax1.set_xlabel("Time")
    ax1.set_ylabel("Transaction count")

    ax2 = ax1.twinx()
    ax2.plot(agg["hour"], agg["total_usd"], marker="o", label="USD value", color="tab:red")
    ax2.set_ylabel("Total USD value")

    fig.suptitle("Figure 5.4 — Bitcoin Whale Transactions (Count & USD Value > $10k)")
    fig.tight_layout()
    plt.show()


# ==========================
# FIGURE 5.5 — SENTIMENT VS NEXT-DAY PRICE CHANGE
# ==========================
def figure_5_5_sentiment_vs_price():
    """
    Assumes trend_prediction.history.csv has at least:
      - 'sentiment_score' or 'polarity'
      - 'next_return_pct' or 'next_price_change'
    """
    df = pd.read_csv(HISTORY_CSV)

    # choose sentiment column
    if "sentiment_score" in df.columns:
        s_col = "sentiment_score"
    elif "polarity" in df.columns:
        s_col = "polarity"
    else:
        raise ValueError("Need sentiment_score / polarity column in history CSV")

    # choose price-change column
    if "next_return_pct" in df.columns:
        p_col = "next_return_pct"
    elif "next_price_change_pct" in df.columns:
        p_col = "next_price_change_pct"
    elif "next_price_change" in df.columns:
        p_col = "next_price_change"
    else:
        raise ValueError("Need next_return_pct / next_price_change column in history CSV")

    df = df.dropna(subset=[s_col, p_col])

    plt.figure(figsize=(8, 5))
    plt.scatter(df[s_col], df[p_col], alpha=0.5)
    plt.title("Figure 5.5 — Sentiment Polarity vs Next-Day Price Change")
    plt.xlabel("Sentiment polarity")
    plt.ylabel("Next 24h price change (e.g., %)")
    plt.tight_layout()
    plt.show()

    corr = df[[s_col, p_col]].corr().iloc[0, 1]
    print(f"Correlation between sentiment and next-day price change: {corr:.3f}")


# ==========================
# TABLE 5.1 / 5.2.5 — MODEL RESULTS
# ==========================
def figure_table_5_1_prediction_results():
    data = {
        "Crypto": ["Bitcoin", "Ethereum", "Solana"],
        "Current Price": [66200, 3180, 142],
        "Predicted Next Price": [66850, 3150, 147],
        "Trend": ["Bullish", "Bearish", "Bullish"],
        "Accuracy (%)": [78, 72, 75],
    }
    df = pd.DataFrame(data)
    print("Table 5.1 — Predicted vs Actual Price Movements")
    print(df)

    # Small bar chart of accuracy per coin
    plt.figure(figsize=(6, 4))
    plt.bar(df["Crypto"], df["Accuracy (%)"])
    plt.ylim(0, 100)
    plt.title("Trend Prediction Accuracy per Coin")
    plt.ylabel("Accuracy (%)")
    plt.tight_layout()
    plt.show()


# ==========================
# 5.2.6 — ACCURACY METRICS (SHORT / MID / LONG)
# ==========================
def figure_5_2_6_accuracy_metrics():
    # using the numbers you gave
    accuracy = {
        "Short-term (1–6h)":  {"Bitcoin": 82, "Ethereum": 75, "Solana": 78},
        "Mid-term (12–24h)": {"Bitcoin": 72, "Ethereum": 68, "Solana": 71},
        "Long-term (24–48h)": {"Bitcoin": 65, "Ethereum": 61, "Solana": 64},
    }

    horizons = list(accuracy.keys())
    coins = ["Bitcoin", "Ethereum", "Solana"]

    # build dataframe
    rows = []
    for h in horizons:
        for c in coins:
            rows.append({"Horizon": h, "Crypto": c, "Accuracy": accuracy[h][c]})
    df = pd.DataFrame(rows)

    # grouped bar plot
    plt.figure(figsize=(10, 5))
    x = range(len(horizons))
    width = 0.25

    for i, coin in enumerate(coins):
        vals = [accuracy[h][coin] for h in horizons]
        positions = [p + (i - 1) * width for p in x]
        plt.bar(positions, vals, width=width, label=coin)

    xticks_positions = x
    plt.xticks(xticks_positions, horizons, rotation=0)
    plt.ylim(0, 100)
    plt.ylabel("Accuracy (%)")
    plt.title("Short / Mid / Long-Term Accuracy per Coin")
    plt.legend()
    plt.tight_layout()
    plt.show()


# ==========================
# 5.2.8 — SYSTEM PERFORMANCE
# ==========================
def figure_5_2_8_system_performance():
    throughput_data = pd.DataFrame({
        "Component": [
            "Twitter sentiment", "Reddit pipeline", "News pipeline"
        ],
        "Rate (items/min)": [260, 18, 100],  # midpoints or representative values
    })

    latency_data = pd.DataFrame({
        "Component": [
            "Prediction engine", "Real-time loop"
        ],
        "Latency (ms)": [300, 0],  # loop is interval-based, so set 0 or skip
        "Interval (min)": [0, 30],
    })

    # Throughput bar
    plt.figure(figsize=(7, 4))
    plt.bar(throughput_data["Component"], throughput_data["Rate (items/min)"])
    plt.title("System Throughput")
    plt.ylabel("Items per minute")
    plt.tight_layout()
    plt.show()

    # Latency/interval (two axes)
    fig, ax1 = plt.subplots(figsize=(7, 4))
    ax1.bar(latency_data["Component"], latency_data["Latency (ms)"], label="Latency (ms)")
    ax1.set_ylabel("Latency (ms)")
    ax2 = ax1.twinx()
    ax2.plot(latency_data["Component"], latency_data["Interval (min)"], marker="o", label="Update interval (min)")
    ax2.set_ylabel("Interval (min)")

    fig.suptitle("System Latency and Update Interval")
    fig.tight_layout()
    plt.show()


# ==========================
# RUN EVERYTHING
# ==========================
def run_all():
    # Twitter / sentiment figures
    figure_5_1_btc_sentiment_distribution()
    figure_5_2_btc_hourly_trend()

    # Cross-platform
    figure_5_3_cross_platform_sentiment("Bitcoin")

    # Whale activity
    figure_5_4_whale_transactions()

    # Prediction history / correlation
    figure_5_5_sentiment_vs_price()

    # Model performance figures
    figure_table_5_1_prediction_results()
    figure_5_2_6_accuracy_metrics()
    figure_5_2_8_system_performance()


if __name__ == "__main__":
    run_all()
