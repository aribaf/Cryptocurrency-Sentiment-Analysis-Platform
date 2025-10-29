from pymongo import MongoClient, UpdateOne # <-- FIX: Import MongoClient and UpdateOne here
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from datetime import datetime
import time
import sys
import logging

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
# !!! IMPORTANT: REPLACE WITH YOUR ACTUAL MONGODB URI !!!
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DB_NAME = "crypto_tweets_db"
COLLECTION_NAME = "latest_tweets"
FINBERT_MODEL = "ProsusAI/finbert"
BATCH_SIZE = 256

class SentimentAnalyzer:
    def __init__(self):
        
        # 1. MongoDB Connection
        try:
            # Note: UpdateOne is imported from pymongo at the top
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[DB_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.client.admin.command('ping')
            logger.info("🗄️ Connected to MongoDB.")
        except Exception as e:
            logger.error(f"❌ Error connecting to MongoDB: {e}")
            sys.exit(1)

        # 2. Load FinBERT Model
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(FINBERT_MODEL)
            self.model = AutoModelForSequenceClassification.from_pretrained(FINBERT_MODEL)
            # Use GPU if available
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            logger.info(f"🧠 FinBERT Model loaded on device: {self.device}")
        except Exception as e:
            logger.error(f"❌ Error loading FinBERT model: {e}")
            logger.error("Please ensure you have 'torch', 'transformers', and 'sentencepiece' installed.")
            sys.exit(1)

        self.sentiment_labels = {0: 'Negative', 1: 'Neutral', 2: 'Positive'}


    def get_unscored_tweets(self, batch_size: int):
        """Query MongoDB for documents missing the 'sentiment' field, limiting the batch size."""
        
        query = {"sentiment": {"$exists": False}}
        tweets_cursor = self.collection.find(query).sort("scraped_at", 1).limit(batch_size)
        return list(tweets_cursor)

    def analyze_batch(self, tweets: list):
        """Tokenizes and runs the FinBERT model on a batch of tweets."""
        texts = [tweet.get('text', '') for tweet in tweets if tweet.get('text')]
        if not texts:
             return []
        
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors='pt').to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        probabilities = torch.softmax(outputs.logits, dim=1)
        results = []

        for i, probs in enumerate(probabilities):
            score_dict = {
                'negative': probs[0].item(),
                'neutral': probs[1].item(),
                'positive': probs[2].item(),
            }
            predicted_class = torch.argmax(probs).item()

            results.append({
                'tweet_id': tweets[i]['tweet_id'],
                'sentiment': {
                    'label': self.sentiment_labels[predicted_class],
                    'scores': score_dict,
                    'model': FINBERT_MODEL,
                    'analyzed_at': datetime.now().isoformat()
                }
            })
            
        return results

    def update_mongodb(self, results: list):
        """Updates MongoDB documents with the new sentiment data using bulk write."""
        updated_count = 0
        
        updates = [
            UpdateOne(
                {'tweet_id': result['tweet_id']}, 
                # 🛠️ THE CRUCIAL FIX: Nest the sentiment data under the 'sentiment' key
                {'$set': {'sentiment': result['sentiment']}} 
            ) for result in results
        ]
        
        if updates:
            update_result = self.collection.bulk_write(updates)
            updated_count = update_result.modified_count
        
        return updated_count

    def run_analysis_cycle(self, batch_size: int):
        """Runs a single cycle of the sentiment analysis process."""
        logger.info(f"--- Starting Analysis Cycle (Batch Size: {batch_size}) ---")
        
        tweets_to_analyze = self.get_unscored_tweets(batch_size)
        num_fetched = len(tweets_to_analyze)
        logger.info(f"🔍 Found {num_fetched} unscored tweets.")
        
        if num_fetched == 0:
            return 0
        
        analysis_results = self.analyze_batch(tweets_to_analyze)
        
        updated = self.update_mongodb(analysis_results)
        
        logger.info(f"✅ Successfully analyzed and updated {updated} tweets.")
        return updated
    
    def close(self):
        """Close the MongoDB connection."""
        self.client.close()
        logger.info("👋 Closed MongoDB connection.")

# ==============================================================================
# Execution Block: Scheduled Sentiment Processor
# ==============================================================================

if __name__ == "__main__":
    
    ANALYSIS_INTERVAL_SECONDS = 900 
    
    analyzer = None
    try:
        analyzer = SentimentAnalyzer()
        
        logger.info("🟢 STARTING SENTIMENT ANALYZER. Press Ctrl+C to stop.")
        
        while True:
            analyzer.run_analysis_cycle(batch_size=BATCH_SIZE)
            
            logger.info(f"😴 Sleeping for {ANALYSIS_INTERVAL_SECONDS} seconds...")
            time.sleep(ANALYSIS_INTERVAL_SECONDS)
            
    except KeyboardInterrupt:
        logger.info("\n\n🛑 Sentiment Analyzer stopped by user (Ctrl+C).")
    except Exception as e:
        logger.critical(f"\n❌ A critical error occurred: {e}", exc_info=True)
    finally:
        if analyzer:
            analyzer.close()