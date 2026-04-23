# CryptoSent - Cryptocurrency Sentiment Analysis Platform

A comprehensive real-time cryptocurrency sentiment analysis platform that scrapes, analyzes, and predicts market trends using social media data from Twitter, Reddit, and news sources.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![React](https://img.shields.io/badge/React-19+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

### 🔗 Live Demo & Repository

| Component | URL |
| :--- | :--- |
| **Live Platform** | https://cryptocurrency-sentiment-analysis-p-one.vercel.app/ |
| **GitHub Repository** | https://github.com/aribaf/Cryptocurrency-Sentiment-Analysis-Platform |

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Features
- **Real-time Sentiment Analysis**: Analyze cryptocurrency sentiment from multiple social media sources
- **Twitter Integration**: Automated tweet scraping and sentiment analysis using Selenium
- **Reddit Analysis**: Monitor cryptocurrency subreddits for sentiment trends
- **News Aggregation**: Collect and analyze crypto-related news articles
- **Trend Prediction**: ML-powered cryptocurrency trend prediction using historical data
- **Live WebSocket Updates**: Real-time sentiment data streaming
- **Interactive Heatmaps**: Visualize sentiment across multiple cryptocurrencies
- **Alert System**: Custom alerts for sentiment changes and trends

### Advanced Features
- **Multi-coin Support**: Track sentiment for multiple cryptocurrencies simultaneously (BTC, ETH, SOLANA)
- **ML Models**: XGBoost, TensorFlow, and Prophet-based prediction models
- **Admin Dashboard**: User management and data export capabilities
- **Authentication**: Secure Google OAuth integration
- **Data Export**: Export sentiment data for analysis
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

### 📡 Multi-Source Sentiment Collection
The system continuously collects cryptocurrency-related text data and market information from multiple public sources. 

#### Data Sources
* Twitter (X) - Real-time tweet scraping
* Reddit - Cryptocurrency subreddit monitoring
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
* Language detection (via langdetect)

#### Models Used
* **HuggingFace Transformers**: DistilBERT fine-tuned on financial sentiment
* **PyTorch**: Deep learning framework
* **NLTK**: Natural language processing toolkit
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
* Historical price patterns

#### Modeling Approach
* **XGBoost**: Gradient boosting for short-term predictions
* **TensorFlow**: Deep learning for pattern recognition
* **Prophet**: Time series forecasting for long-term trends
* Hybrid ensemble strategy combining rule-based signals and machine learning outputs

#### Outputs
* Market direction (**Bullish** / **Bearish**)
* Prediction confidence score (0–100%)
* Most likely short-term trend
* Historical trend analysis

### 📊 Interactive Dashboard (React)
A responsive single-page application for real-time visualization and analysis.

* Live sentiment feeds and aggregate market scores
* Source-wise sentiment breakdown (Twitter, Reddit, News)
* Coin-specific prediction cards for BTC, ETH, and SOL
* Trend confidence visualization
* Historical sentiment and trend charts
* Search and time-based filtering
* Interactive heatmaps for multi-coin analysis
* Fully responsive UI design with Tailwind CSS
* Real-time WebSocket updates
* Chart.js and Recharts for data visualization

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
└────────┬────────┘
         │
    ┌────▼────┐
    │  FastAPI │
    │   API    │
    └────┬─────┘
         │
    ┌────▼─────────────────────────┐
    │    Sentiment Pipeline         │
    ├───────────────────────────────┤
    │ • Twitter Scraper (Selenium)  │
    │ • Reddit Scraper              │
    │ • News Aggregator             │
    │ • Sentiment Analyzer (BERT)   │
    └────┬──────────────────────────┘
         │
    ┌────▼─────────────────────────┐
    │   Trend Prediction Engine     │
    ├───────────────────────────────┤
    │ • XGBoost Models              │
    │ • TensorFlow/Prophet          │
    │ • Real-time Workers           │
    └────┬──────────────────────────┘
         │
    ┌────▼────┐
    │ MongoDB │
    └─────────┘
```

### **Backend Architecture (FastAPI)**
The backend is designed for scalability, concurrency, and modularity.

* Layered and modular architecture
* Asynchronous REST API endpoints for low-latency responses
* Dedicated sentiment and trend processing workers
* Background schedulers for automated data ingestion (APScheduler)
* Optimized MongoDB aggregation pipelines
* JWT-based authentication and Google OAuth integration
* WebSocket support for real-time updates
* CORS middleware for cross-origin requests

### **Database Architecture (MongoDB)**
A flexible NoSQL schema supports both unstructured text data and structured market data. 

#### Collections
* `twitter_posts`
* `reddit_posts`
* `news_posts`
* `sentiment_history`
* `trend_predictions`
* `users`
* `alerts`
* `transactions`

#### Database Features
* Indexed queries for fast retrieval
* Aggregation pipelines for analytics
* Clean and structured document design
* Time-series data optimization

---

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework for building APIs
- **Python 3.8+**: Core programming language
- **MongoDB**: NoSQL database for storing sentiment data
- **PyMongo**: MongoDB driver for Python
- **Selenium**: Web scraping for Twitter
- **BeautifulSoup4**: HTML parsing for news scraping
- **Transformers (HuggingFace)**: Pre-trained models for sentiment analysis
- **PyTorch**: Deep learning framework
- **NLTK**: Natural language processing toolkit

### Machine Learning
- **XGBoost**: Gradient boosting for trend prediction
- **TensorFlow**: Deep learning models
- **Prophet**: Time series forecasting
- **Scikit-learn**: ML utilities and preprocessing
- **Pandas & NumPy**: Data manipulation and analysis

### Frontend
- **React 19**: Modern UI library
- **Vite**: Fast build tool and development server
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Chart.js & Recharts**: Data visualization
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **GSAP**: Advanced animations
- **Radix UI**: Accessible component primitives
- **Heroicons**: Icon library

### DevOps & Deployment
- **Docker & Docker Compose**: Containerization
- **Uvicorn**: ASGI server
- **APScheduler**: Job scheduling
- **dotenv**: Environment variable management
- **Vercel**: Frontend deployment
- **MongoDB Atlas**: Cloud database

---

## 📁 Project Structure

```
scrapper/
├── api/                          # FastAPI backend
│   ├── main.py                   # Main API application
│   ├── auth.py                   # Authentication routes
│   ├── routes_*.py               # Feature-specific routes
│   ├── transactions.py           # Transaction handling
│   ├── ws_live.py               # WebSocket endpoints
│   └── dependencies/             # Dependency injection
│
├── sentiment_pipeline/           # Data collection & analysis
│   ├── twitter/                  # Twitter scraping
│   │   └── pipeline.py          # Twitter data pipeline
│   ├── reddit/                   # Reddit scraping
│   │   └── automation.py        # Reddit automation
│   ├── news/                     # News aggregation
│   │   └── news.py              # News scraper
│   ├── scripts/                  # Utility scripts
│   │   └── btc_streamer.py      # BTC data streaming
│   ├── alerts/                   # Alert system
│   ├── sentiment_analyzer.py     # Core sentiment analysis
│   ├── sentiment_aggregator.py   # Data aggregation
│   └── api_server.py            # Pipeline API server
│
├── trend_prediction/             # ML prediction models
│   ├── train_model.py           # Model training
│   ├── realtime_predictor.py    # Real-time predictions
│   ├── realtime_worker.py       # Prediction worker
│   ├── trend_worker_multi.py    # Multi-coin worker
│   ├── backfill_trend_history.py # Historical data backfill
│   └── models/                   # Trained models
│
├── crypto-sentiment-frontend/    # React frontend (Vite)
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   ├── api/                 # API integration
│   │   ├── context/             # React context
│   │   ├── admin/               # Admin panel
│   │   ├── models/              # Data models
│   │   └── utils/               # Utility functions
│   └── public/                   # Static assets
│
├── frontend/                     # Alternative frontend
├── dataset/                      # Training datasets
├── exports/                      # Data exports
├── outputs/                      # Model outputs
├── docker-compose.yml           # Docker services
├── Dockerfile                   # Docker build file
├── requirements.txt             # Python dependencies
├── package.json                 # Node.js dependencies (Next.js)
└── README.md                    # This file
```

---

## 🚀 Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 18+ and npm/pnpm
- MongoDB instance (local or cloud)
- Google OAuth credentials (for authentication)
- Chrome/Chromium browser (for Selenium)

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/aribaf/Cryptocurrency-Sentiment-Analysis-Platform.git
cd scrapper
```

2. **Create a virtual environment**
```bash
python -m venv newenv
# On Windows
newenv\Scripts\activate
# On Unix/MacOS
source newenv/bin/activate
```

3. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

4. **Download NLTK data**
```python
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt'); nltk.download('stopwords')"
```

5. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Frontend Setup

1. **Install frontend dependencies (Next.js)**
```bash
pnpm install
```

2. **Install Vite frontend dependencies**
```bash
cd crypto-sentiment-frontend
npm install
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=crypto_sentiment

# API Keys
GROQ_API_KEY=your_groq_api_key

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SECRET_KEY=your_secret_key_for_sessions

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Cookies
COOKIE_SAMESITE=lax
COOKIE_HTTPS_ONLY=false

# Twitter/Reddit Credentials (if needed)
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
```

Create `config.json` for sentiment pipeline:
```json
{
  "mongodb_uri": "mongodb://localhost:27017/",
  "db_name": "crypto_sentiment",
  "collection_name": "tweets"
}
```

---

## 🎯 Usage

### Using Docker (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services running:
- News scraper
- Reddit scraper
- Twitter pipeline
- BTC data streamer
- Real-time prediction worker
- Multi-coin trend worker

### Manual Setup

**Start the FastAPI backend:**
```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Start the sentiment pipeline workers:**
```bash
# Twitter scraper
python sentiment_pipeline/twitter/pipeline.py

# Reddit scraper
python sentiment_pipeline/reddit/automation.py

# News aggregator
python sentiment_pipeline/news/news.py

# BTC streamer
python sentiment_pipeline/scripts/btc_streamer.py
```

**Start trend prediction workers:**
```bash
# Real-time predictor
python trend_prediction/realtime_worker.py

# Multi-coin trend worker
python trend_prediction/trend_worker_multi.py
```

**Start the frontend:**

Next.js:
```bash
npm run dev
# Access at http://localhost:3000
```

Vite frontend:
```bash
cd crypto-sentiment-frontend
npm run dev
# Access at http://localhost:5173
```

---

## 📚 API Documentation

Once the FastAPI backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/google/login` - Google OAuth login
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### Sentiment Analysis
- `GET /api/sentiment/{coin}` - Get sentiment data for a coin
- `GET /api/sentiment/trends` - Get overall sentiment trends
- `GET /api/heatmap` - Get sentiment heatmap data

#### Social Media
- `GET /api/twitter/{coin}` - Get Twitter sentiment
- `GET /api/reddit/{coin}` - Get Reddit sentiment
- `GET /api/news` - Get news sentiment

#### Trends & Predictions
- `GET /api/trends/{coin}` - Get trend predictions
- `GET /api/trends/history/{coin}` - Get historical trends

#### Alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts` - Get user alerts
- `DELETE /api/alerts/{alert_id}` - Delete alert

#### WebSocket
- `WS /ws/live` - Real-time sentiment updates

#### Admin (Authentication Required)
- `GET /api/admin/users` - Manage users (admin only)
- `GET /api/admin/exports` - Export data (admin only)

---

## 🐳 Deployment

### Docker Deployment

1. **Build the image:**
```bash
docker build -t cryptosent:latest .
```

2. **Run with docker-compose:**
```bash
docker-compose up -d
```

### Cloud Deployment

The project is configured for deployment on:
- **Frontend**: Vercel (configured with `vercel.json`)
- **Backend**: Any cloud platform supporting Docker (AWS ECS, Google Cloud Run, Azure Container Apps, etc.)
- **Database**: MongoDB Atlas

Update `ALLOWED_ORIGINS` in your environment variables to include your production URLs.

**Vercel Deployment:**
```bash
# Frontend deployment
cd crypto-sentiment-frontend
npm run build
vercel deploy
```

---

## 📊 Machine Learning Models

### Sentiment Analysis
- **Model**: DistilBERT fine-tuned on financial sentiment
- **Pipeline**: HuggingFace Transformers
- **Languages**: English (with language detection via langdetect)
- **Output**: Positive/Negative/Neutral with confidence scores

### Trend Prediction
- **XGBoost**: Gradient boosting for short-term predictions
- **TensorFlow**: Deep learning for pattern recognition
- **Prophet**: Time series forecasting for long-term trends
- **Features**: Historical prices, sentiment scores, volume, social metrics

### Training
```bash
# Train the trend prediction model
python trend_prediction/train_model.py

# Backfill historical data
python trend_prediction/backfill_trend_history.py
```

---

## 🔧 Development

### Project Documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [MULTI_COIN_SENTIMENT_FIX.md](MULTI_COIN_SENTIMENT_FIX.md) - Multi-coin feature documentation
- [RESPONSIVE_DESIGN_IMPROVEMENTS.md](RESPONSIVE_DESIGN_IMPROVEMENTS.md) - UI/UX improvements

### Code Style
- Python: Follow PEP 8
- JavaScript/React: ESLint configured
- CSS: Stylelint configured

### Running Tests
```bash
# Python tests
python -m pytest

# Frontend tests
cd crypto-sentiment-frontend
npm run test
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- HuggingFace Transformers for sentiment analysis models
- FastAPI for the excellent web framework
- React and Vite communities for frontend tools
- MongoDB for flexible data storage
- All open-source contributors

---

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**⚠️ Important Note**: This project is for educational and research purposes. Always comply with social media platforms' Terms of Service and rate limits when scraping data.
