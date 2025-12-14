## Cryptocurrency Sentiment & Market Trend Prediction Platform

A full-stack **AI-powered platform** designed to provide actionable insights into the cryptocurrency market by analyzing public sentiment and predicting short-term price movements.

This system gathers **real-time cryptocurrency data**, analyzes sentiment using **NLP/ML models**, and predicts short-term market trends using a combination of sentiment features and technical indicators.

It provides a unified **interactive dashboard** for tracking the current market mood, sentiment polarity, prediction confidence levels, and trend forecasts for major coins like **BTC**, **ETH**, and **SOLANA**.

---

### 🔗 Live Demo & Repository

| Component | URL |
| :--- | :--- |
| **Live Platform** | https://cryptocurrency-sentiment-analysis-p-one.vercel.app/ |
| **GitHub Repository** | https://github.com/aribaf/Cryptocurrency-Sentiment-Analysis-Platform |

### 💻 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | FastAPI (Python) | High-performance, asynchronous web framework. |
| **Frontend** | React + Vite | Modern single-page application with fast builds. |
| **Database** | MongoDB Atlas | NoSQL database for scalable data storage. |
| **ML/NLP** | NLTK, Scikit-learn, TensorFlow | Core libraries for text processing and model training. |
| **Deployment** | Docker, Render, AWS, Vercel | Containerization and seamless front-end deployment. |

---

## ✨ Features

### 📡 Multi-Source Sentiment Collection
The system continuously collects cryptocurrency-related text data and market information from multiple public sources. 

#### Data Sources
* Twitter (X)
* Reddit
* Cryptocurrency news APIs
* Market candle (OHLC) data

> 📝 **Note:** All collected data is cleaned, normalized, and stored for downstream sentiment analysis and trend prediction.

### 🧠 NLP-Based Sentiment Analysis
A complete text preprocessing and classification pipeline ensures high-quality sentiment predictions.

#### Preprocessing Pipeline
* Tokenization
* Stopword removal
* Lemmatization
* Noise and URL cleaning
* Text normalization and lowercasing

#### Models Used
* Logistic Regression (baseline)
* Support Vector Machine (SVM)
* **BiLSTM (TensorFlow)** for deep contextual understanding
* Softmax-based probability scoring

Each post is classified as **Positive**, **Negative**, or **Neutral**, along with a confidence score.

### 🔮 Market Trend Prediction Engine
The platform predicts short-term market direction (**Bullish** or **Bearish**) by combining sentiment-driven features with technical indicators. 

#### Features Used
* **Technical indicators:** Exponential Moving Average (EMA), Relative Strength Index (RSI), Moving Average Convergence Divergence (MACD)
* Market volatility metrics
* Aggregated sentiment scores across all data sources

#### Modeling Approach
* Hybrid ensemble strategy combining rule-based signals and machine learning outputs

#### Outputs
* Market direction (**Bullish** / **Bearish**)
* Prediction confidence score (0–100%)
* Most likely short-term trend

### 📊 Interactive Dashboard (React)
A responsive single-page application for real-time visualization and analysis.

* Live sentiment feeds and aggregate market scores
* Source-wise sentiment breakdown (Twitter, Reddit, News)
* Coin-specific prediction cards for BTC, ETH, and SOL
* Trend confidence visualization
* Historical sentiment and trend charts
* Search and time-based filtering
* Fully responsive UI design

---

## 🏗️ Architecture

### **Backend Architecture (FastAPI)**
The backend is designed for scalability, concurrency, and modularity.

* Layered and modular architecture
* Asynchronous REST API endpoints for low-latency responses
* Dedicated sentiment and trend processing workers
* Background schedulers for automated data ingestion
* Optimized MongoDB aggregation pipelines
* JWT-based authentication and account management

### **Database Architecture (MongoDB)**
A flexible NoSQL schema supports both unstructured text data and structured market data. 

#### Collections
* `twitter_posts`
* `reddit_posts`
* `news_posts`
* `sentiment_history`
* `trend_predictions`
* `users`

#### Database Features
* Indexed queries for fast retrieval
* Aggregation pipelines for analytics
* Clean and structured document design


---

