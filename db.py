# db.py
from pymongo import MongoClient
import logging

MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"

try:
    client = MongoClient(MONGO_URI)
    db = client["twitter_scraper"]
    
    # Test connection
    client.admin.command('ping')
    print("✅ MongoDB connection successful")
    
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    raise

# Collection definitions
tweets_collection = db["tweets"]                    # For normal account-based tweets
hashtag_tweets_collection = db["hashtagtweets"]    # For hashtag-based tweets  
scrappertweets_collection = db["scrappertweets"]   # For scraper tweets (used by feature extraction)
news_collection = db["news"]                       # For news articles
price_collection = db["market_prices"]             # For cryptocurrency prices
features_collection = db["features"]
predictions_collection = db["ml_predictions"]
models_collection = db["ml_models"]
      # For model predictions

def setup_database_indexes():
    """
    Setup database indexes for better performance.
    Call this function when needed, not at import time.
    """
    try:
        # Tweets collection indexes
        tweets_collection.create_index([("username", 1), ("tweet_id", 1)], unique=True)
        tweets_collection.create_index("timestamp")
        print("✅ Tweets collection indexes created")
        
        # Hashtag tweets collection indexes
        hashtag_tweets_collection.create_index([("hashtag", 1), ("tweet_id", 1)], unique=True)
        hashtag_tweets_collection.create_index("timestamp")
        print("✅ Hashtag tweets collection indexes created")
        
        # Scrapper tweets collection indexes (for feature extraction)
        scrappertweets_collection.create_index("tweet_id", unique=True)
        scrappertweets_collection.create_index("timestamp")
        scrappertweets_collection.create_index("sentiment")
        print("✅ Scrapper tweets collection indexes created")
        
        # News collection indexes
        news_collection.create_index("url", unique=True)
        news_collection.create_index("timestamp")
        print("✅ News collection indexes created")
        
        # Price collection indexes
        price_collection.create_index("timestamp", unique=True)
        price_collection.create_index([("crypto", 1), ("timestamp", -1)])
        print("✅ Price collection indexes created")
        
        # Features collection indexes
        features_collection.create_index("timestamp")
        features_collection.create_index([("crypto", 1), ("currency", 1), ("timestamp", -1)])
        features_collection.create_index("extraction_timestamp")
        features_collection.create_index("trend")
        print("✅ Features collection indexes created")
        
        # Predictions collection indexes
        predictions_collection.create_index("timestamp")
        predictions_collection.create_index([("crypto", 1), ("model_version", 1), ("timestamp", -1)])
        print("✅ Predictions collection indexes created")
        
        print("✅ All database indexes created successfully")
        return True
        
    except Exception as e:
        print(f"⚠️ Error creating indexes: {e}")
        return False

def get_collection_stats():
    """Get statistics for all collections"""
    stats = {}
    collections = {
        'tweets': tweets_collection,
        'hashtag_tweets': hashtag_tweets_collection, 
        'scrapper_tweets': scrappertweets_collection,
        'news': news_collection,
        'prices': price_collection,
        'features': features_collection,
        'predictions': predictions_collection
    }
    
    for name, collection in collections.items():
        try:
            count = collection.count_documents({})
            stats[name] = {
                'count': count,
                'collection_name': collection.name
            }
            
            # Get date range if timestamp field exists
            if count > 0:
                try:
                    oldest = collection.find().sort("timestamp", 1).limit(1)
                    newest = collection.find().sort("timestamp", -1).limit(1)
                    oldest_doc = list(oldest)
                    newest_doc = list(newest)
                    
                    if oldest_doc and newest_doc:
                        stats[name]['date_range'] = {
                            'earliest': oldest_doc[0].get('timestamp'),
                            'latest': newest_doc[0].get('timestamp')
                        }
                except:
                    pass  # Skip date range if timestamp field doesn't exist
                    
        except Exception as e:
            stats[name] = {'error': str(e)}
    
    return stats

def test_collections():
    """Test that all collections are accessible"""
    collections_to_test = [
        ('tweets', tweets_collection),
        ('hashtag_tweets', hashtag_tweets_collection),
        ('scrapper_tweets', scrappertweets_collection), 
        ('news', news_collection),
        ('prices', price_collection),
        ('features', features_collection),
        ('predictions', predictions_collection)
    ]
    
    print("Testing collection accessibility:")
    all_good = True
    
    for name, collection in collections_to_test:
        try:
            # Try to access the collection
            count = collection.count_documents({})
            print(f"✅ {name}: {count} documents")
        except Exception as e:
            print(f"❌ {name}: Error - {e}")
            all_good = False
    
    return all_good

if __name__ == "__main__":
    # Test collections when running directly
    print("=== Database Connection Test ===")
    test_collections()
    
    print("\n=== Collection Statistics ===")
    stats = get_collection_stats()
    for name, info in stats.items():
        if 'error' in info:
            print(f"❌ {name}: {info['error']}")
        else:
            date_info = ""
            if 'date_range' in info:
                date_info = f" (from {info['date_range']['earliest']} to {info['date_range']['latest']})"
            print(f"✅ {name}: {info['count']} documents{date_info}")
    
    print("\n=== Setting Up Indexes ===")
    setup_database_indexes()