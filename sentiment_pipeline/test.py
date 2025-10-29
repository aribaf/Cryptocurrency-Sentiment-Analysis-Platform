import csv
import json
from pymongo import MongoClient
from datetime import datetime
import traceback

# --- Configuration ---
# NOTE: This MUST be the same MongoDB connection string used in your scraper file.
MONGO_URI = "mongodb+srv://aribafaryad:uGZKX4AZ5F7vEjkW@tweets.d0g9ckv.mongodb.net/?retryWrites=true&w=majority&appName=tweets"
DATABASE_NAME = "crypto_tweets_db"  # Matches the default db_name in CoinTweetScraper
COLLECTION_NAME = "latest_tweets" # Matches the default collection_name in CoinTweetScraper
# ---------------------

def connect_to_mongo(uri, db_name, collection_name):
    """
    Establishes connection to MongoDB and returns the specified collection.
    Returns the collection object on success, or None on failure.
    """
    try:
        print("-> Attempting to connect to MongoDB...")
        client = MongoClient(uri)
        db = client[db_name]
        collection = db[collection_name]
        # Verify connection by running a command
        client.admin.command('ismaster')
        print(f"-> Successfully connected to database '{db_name}' and collection '{collection_name}'.")
        return collection
    except Exception as e:
        print(f"ERROR: Could not connect to MongoDB. Please check MONGO_URI and ensure access is permitted.")
        print(f"Details: {e}")
        # Ensure we return None on failure
        return None 

def fetch_tweets(collection):
    """
    Retrieves all documents from the specified MongoDB collection.
    """
    if collection is None:
        return []

    print(f"-> Fetching all tweets from '{collection.name}'...")
    # Use find({}) to retrieve all documents
    documents = list(collection.find({}))
    print(f"-> Fetched {len(documents)} documents.")
    return documents

def clean_documents_for_export(documents):
    """
    Converts MongoDB-specific types (like ObjectId) into serializable strings 
    and prepares fields for CSV/JSON export.
    """
    cleaned_docs = []
    for doc in documents:
        # 1. Convert the MongoDB ObjectId into a string
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
        
        # 2. Convert datetime objects (if any were stored) to string format
        # This prevents issues during JSON/CSV serialization
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
            
        cleaned_docs.append(doc)
    return cleaned_docs

def export_to_csv(documents, filename="latest_tweets_export.csv"):
    """
    Exports a list of dictionaries (documents) to a CSV file.
    """
    if not documents:
        print("No data to export to CSV.")
        return

    # Determine the field names (header row) based on the first document's keys
    # Use traceback to ensure we capture the error if the list is empty (though checked above)
    try:
        fieldnames = list(documents[0].keys())
    except IndexError:
        print("Error: Document list is empty or invalid data structure.")
        return
        
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(documents)
        print(f"✅ SUCCESS: Data successfully exported to CSV file: {filename}")
    except Exception as e:
        print(f"❌ ERROR: Failed to write to CSV file.")
        traceback.print_exc()

def export_to_json(documents, filename="latest_tweets_export.json"):
    """
    Exports a list of dictionaries (documents) to a JSON file.
    """
    if not documents:
        print("No data to export to JSON.")
        return

    try:
        with open(filename, 'w', encoding='utf-8') as jsonfile:
            # Use indent=4 for a human-readable, pretty-printed JSON output
            json.dump(documents, jsonfile, indent=4)
        print(f"✅ SUCCESS: Data successfully exported to JSON file: {filename}")
    except Exception as e:
        print(f"❌ ERROR: Failed to write to JSON file. Details: {e}")


if __name__ == "__main__":
    # 1. Connect and fetch the collection
    tweet_collection = connect_to_mongo(MONGO_URI, DATABASE_NAME, COLLECTION_NAME)

    # 🔑 FIX: Explicitly check if the collection object is not None
    # This addresses the pymongo NotImplementedError.
    if tweet_collection is not None:
        # 2. Fetch all tweets
        all_tweets = fetch_tweets(tweet_collection)

        if all_tweets:
            # 3. Clean the documents for serialization (CSV/JSON)
            cleaned_tweets = clean_documents_for_export(all_tweets)

            # 4. Choose your output format
            # To export to CSV (default):
            export_to_csv(cleaned_tweets, "latest_tweets_data.csv")

            # To export to JSON (uncomment this line instead):
            # export_to_json(cleaned_tweets, "latest_tweets_data.json")
    else:
        print("🛑 Export process halted due to failed MongoDB connection.")

    print("\n--- Exporter Script finished ---")
