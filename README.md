## Cryptocurrency Sentiment & Market Trend Prediction Platform

A full-stack **AI-powered platform** designed to provide actionable insights into the cryptocurrency market by analyzing public sentiment and predicting short-term price movements.

This system gathers **real-time cryptocurrency data**, analyzes sentiment using **NLP/ML models**, and predicts short-term market trends using a combination of sentiment features and technical indicators.

It provides a unified **interactive dashboard** for tracking the current market mood, sentiment polarity, prediction confidence levels, and trend forecasts for major coins like **BTC**, **ETH**, and **SOLANA**.

---

### 🔗 Live Demo

| Component | URL |
| :--- | :--- |
| **Live Platform** | https://cryptocurrency-sentiment-analysis-p-one.vercel.app/ |
| **GitHub Repository** | `https://github.com/aribaf/crypto-sentiment-platform.git` |

### Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | FastAPI (Python) | High-performance, asynchronous web framework. |
| **Frontend** | React.js | Interactive, responsive user interface. |
| **Database** | MongoDB | NoSQL database for flexible data storage and aggregation. |
| **ML/NLP** | NLTK, Scikit-learn, TensorFlow | Core libraries for text processing and model training. |
| **Deployment** | Docker, Vercel | Containerization and seamless front-end deployment. |

---

## Features

### 📡 Multi-Source Sentiment Collection
Automatically fetches real-time crypto-related text data from multiple public sources and historical market candle data.

* **Twitter**
* **Reddit**
* **News APIs**
* **Market candle data**

Each post is cleaned, labeled, and stored for subsequent analysis by the NLP models.

###  NLP-Based Sentiment Analysis
A robust full preprocessing pipeline ensures clean, normalized text data for high-accuracy sentiment classification.

* **Preprocessing Pipeline:**
    * Tokenization
    * Stopword removal
    * Lemmatization
    * Noise cleaning
    * Lowercasing & normalization
* **Models Used:**
    * **Logistic Regression** (Baseline)
    * **Support Vector Machine (SVM)**
    * **BiLSTM** (TensorFlow) - Deep Learning for complex context capture
    * **Softmax-based probability scoring**
* **Classification:** Each post is classified as **Positive**, **Negative**, or **Neutral**.

### 🔮 Trend Prediction Engine
Predicts the short-term market direction—**Bullish** or **Bearish**—using a blend of technical and sentiment-driven features.

* **Features Used:**
    * **Technical Indicators:** Exponential Moving Average (EMA), Relative Strength Index (RSI), Moving Average Convergence Divergence (MACD)
    * Market volatility features
    * Aggregate sentiment scores from all sources
* **Modeling:** **Ensemble modeling** (rule-based signals combined with ML signals) is used for the final prediction.
* **Outputs:**
    * Market direction (**Bullish/Bearish**)
    * Confidence score (**0–100%**)
    * Most likely trend

### Interactive Dashboard (React.js)
A single-page application built for real-time data visualization and user interaction.

* **Real-time sentiment feeds** and aggregate scores.
* **Source-wise breakdown** visualization (Twitter, Reddit, News).
* **Prediction cards** for each tracked coin (BTC, ETH, SOLANA).
* **Confidence visualization** for trend predictions.
* **Trend history logs** and sentiment timeline charts.
* **Search and time filters** for historical data analysis.
* **Fully responsive UI** design.

---

##  Architecture

### **Backend Architecture (FastAPI)**
The backend is designed for high concurrency and scalability, utilizing Python's asynchronous capabilities.

* Layered, modular, and scalable design.
* Asynchronous API endpoints for fast response times.
* Dedicated **Sentiment and trend workers** for resource-intensive processing.
* **Background scheduler** for continuous, automated data scraping.
* Optimized **MongoDB aggregation pipelines** for complex data reporting.
* Security: **JWT authentication**, account settings, and **OTP-based verification**.

### **Database (MongoDB)**
A flexible NoSQL structure allows for easy storage and retrieval of unstructured text data alongside structured market data.

* **Collections:**
    * `twitter_posts`
    * `reddit_posts`
    * `news_posts`
    * `sentiment_history`
    * `trend_predictions`
    * `users`
* **Features:** Aggregation framework, optimized indexing, and clean structured documents.

---

## 📁 Project Structure
