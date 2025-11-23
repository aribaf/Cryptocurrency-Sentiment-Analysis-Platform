from pymongo import MongoClient, UpdateOne
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from datetime import datetime
import time
import sys
import logging
from pymongo.errors import BulkWriteError, ConnectionFailure # New: Import specific MongoDB errors

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
# !!! IMPORTANT: REPLACE WITH YOUR ACTUAL MONGODB URI !!!
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DB_NAME = "crypto_tweets_db"
COLLECTION_NAME = "latest_tweets"
FINBERT_MODEL = "ProsusAI/finbert"
BATCH_SIZE = 64 # Changed default to 64 for lower CPU/GPU usage

class SentimentAnalyzer:
    def __init__(self):
        
        # 1. MongoDB Connection
        try:
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[DB_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.client.admin.command('ping')
            logger.info("🗄️ Connected to MongoDB.")
        except ConnectionFailure as e:
            logger.error(f"❌ Error connecting to MongoDB (Check URI/Network): {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"❌ Unhandled error during MongoDB connection: {e}")
            sys.exit(1)

        # 2. Load FinBERT Model
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(FINBERT_MODEL)
            self.model = AutoModelForSequenceClassification.from_pretrained(FINBERT_MODEL)
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            logger.info(f"🧠 FinBERT Model loaded on device: {self.device}")
        except Exception as e:
            logger.error(f"❌ Error loading FinBERT model or PyTorch: {e}")
            logger.error("Please ensure you have 'torch', 'transformers', and 'sentencepiece' installed.")
            sys.exit(1)

        self.sentiment_labels = {0: 'Negative', 1: 'Neutral', 2: 'Positive'}


    def get_unscored_tweets(self, batch_size: int):
        """Query MongoDB for documents missing the 'sentiment' field, limiting the batch size."""
        
        # NOTE: Using 'scraped_at' sorting (1=Ascending) prioritizes older tweets, which is good for backlog processing
        query = {"sentiment": {"$exists": False}}
        tweets_cursor = self.collection.find(query).sort("scraped_at", 1).limit(batch_size)
        return list(tweets_cursor)

    def analyze_batch(self, tweets: list):
        """Tokenizes and runs the FinBERT model on a batch of tweets."""
        texts = [tweet.get('text', '') for tweet in tweets if tweet.get('text')]
        
        if not texts:
            logger.warning("⚠️ Batch contained no valid text for analysis.")
            return []
            
        try:
            # Tokenize and move tensors to the determined device (CPU or GPU)
            inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors='pt').to(self.device)
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                
            probabilities = torch.softmax(outputs.logits, dim=1)
            results = []

            # Match results back to the original tweet IDs
            for i, probs in enumerate(probabilities):
                score_dict = {
                    'negative': probs[0].item(),
                    'neutral': probs[1].item(),
                    'positive': probs[2].item(),
                }
                predicted_class = torch.argmax(probs).item()

                results.append({
                    # Use the original tweet_id for the update query later
                    'tweet_id': tweets[i]['tweet_id'], 
                    'sentiment': {
                        'label': self.sentiment_labels[predicted_class],
                        'scores': score_dict,
                        'model': FINBERT_MODEL,
                        'analyzed_at': datetime.now().isoformat()
                    }
                })
            
            return results
        except Exception as e:
            logger.error(f"❌ Error during FinBERT analysis of the batch: {e}", exc_info=True)
            return []


    def update_mongodb(self, results: list):
        """Updates MongoDB documents with the new sentiment data using bulk write."""
        updated_count = 0
        
        updates = [
            UpdateOne(
                {'tweet_id': result['tweet_id']}, 
                {'$set': {'sentiment': result['sentiment']}}
            ) for result in results
        ]
        
        if updates:
            try:
                update_result = self.collection.bulk_write(updates)
                updated_count = update_result.modified_count
            except BulkWriteError as bwe:
                logger.error(f"❌ Bulk write failed! Check database for errors: {bwe.details}", exc_info=True)
            except Exception as e:
                logger.error(f"❌ Unknown error during MongoDB bulk update: {e}", exc_info=True)
            
        return updated_count

    def run_analysis_cycle(self, batch_size: int):
        """Runs a single cycle of the sentiment analysis process."""
        logger.info(f"--- Starting Analysis Cycle (Batch Size: {batch_size}) ---")
        
        tweets_to_analyze = self.get_unscored_tweets(batch_size)
        num_fetched = len(tweets_to_analyze)
        logger.info(f"🔍 Found {num_fetched} unscored tweets.")
        
        if num_fetched == 0:
            logger.info("💤 No unscored tweets found. Analysis cycle complete.")
            return 0
        
        # 1. Analyze the tweets
        analysis_results = self.analyze_batch(tweets_to_analyze)
        
        if not analysis_results:
            logger.warning("⚠️ Analysis produced no results. Skipping update.")
            return 0
        
        logger.info(f"✨ Analysis complete for {len(analysis_results)} tweets. Starting database update...")
        
        # 2. Update MongoDB
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

import time
from datetime import timedelta

if __name__ == "__main__":
    ANALYSIS_INTERVAL_SECONDS = 60 # Changed to 60 seconds (1 minute) for quick testing/processing

    analyzer = None
    try:
        analyzer = SentimentAnalyzer()

        logger.info("🟢 STARTING SENTIMENT ANALYZER. Press Ctrl+C to stop.")

        while True:
            # Use the BATCH_SIZE defined in configuration
            analyzer.run_analysis_cycle(batch_size=BATCH_SIZE)

            # human-readable sleep message
            hr = timedelta(seconds=ANALYSIS_INTERVAL_SECONDS)
            logger.info(f"😴 Sleeping for {ANALYSIS_INTERVAL_SECONDS} seconds ({hr})...")
            time.sleep(ANALYSIS_INTERVAL_SECONDS)

    except KeyboardInterrupt:
        logger.info("\n\n🛑 Sentiment Analyzer stopped by user (Ctrl+C).")
    except Exception as e:
        logger.critical(f"\n❌ A critical error occurred: {e}", exc_info=True)
    finally:
        if analyzer:
            analyzer.close()