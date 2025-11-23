from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# Load trained model
model = joblib.load("model/crypto_trend_model.pkl")

@app.route('/')
def home():
    return "Crypto Sentiment Trend Prediction API is running!"

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    sentiment = float(data['sentiment'])
    volume = float(data['volume'])
    price_open = float(data['price_open'])

    # Make prediction
    prediction = model.predict([[sentiment, volume, price_open]])[0]
    confidence = max(model.predict_proba([[sentiment, volume, price_open]])[0])

    label = "Bullish" if prediction == 1 else "Bearish"

    return jsonify({
        "prediction": label,
        "confidence": round(confidence * 100, 2)
    })

if __name__ == '__main__':
    app.run(debug=True)
