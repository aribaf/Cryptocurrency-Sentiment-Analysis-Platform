from pymongo import MongoClient
from datetime import datetime
from automation import finbert_predict, ensemble_decision  # import from your main script

import os
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "crypto")
MONGO_COLLECTION_POSTS = os.getenv("MONGO_COLLECTION_POSTS", "reddit_posts")

client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
db = client[MONGO_DB]
collection = db[MONGO_COLLECTION_POSTS]

def rescore_all_posts(batch_size=50):
    cursor = collection.find({}, {"_id": 1, "text": 1})
    docs = list(cursor)

    print(f"Found {len(docs)} posts to rescore")

    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]

        texts = [doc.get("text", "") for doc in batch]

        finbert_outputs = finbert_predict(texts)

        for j, doc in enumerate(batch):
            fin = finbert_outputs[j]
            ensemble = ensemble_decision(fin, doc["text"])

            new_sentiment = {
                "label": ensemble["label"],
                "scores": {
                    "positive": ensemble["finbert"]["pos"],
                    "neutral": ensemble["finbert"]["neu"],
                    "negative": ensemble["finbert"]["neg"],
                },
                "polarity": float(ensemble["polarity_score"]),
                "confidence": float(ensemble["confidence"]),
                "vader": ensemble["vader"],
            }

            collection.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "sentiment": new_sentiment,
                        "rescored_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
                    }
                }
            )

        print(f"Rescored {i + len(batch)} / {len(docs)} posts")

    print("✅ All posts re-scored successfully!")

if __name__ == "__main__":
    rescore_all_posts()
