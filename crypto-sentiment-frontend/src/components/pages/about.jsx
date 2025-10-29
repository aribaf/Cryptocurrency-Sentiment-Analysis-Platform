import React from 'react'


export default function About(){
return (
<div className="prose prose-invert max-w-none">
<h1>About CryptoSent</h1>
<p>This dashboard visualizes sentiment for cryptocurrencies across Twitter, Reddit and News sources. Data is collected by your Python scrapers, analyzed by FinBERT, aggregated and served by the FastAPI backend.</p>
<h3>How it works</h3>
<ul>
<li>Scrapers gather posts into MongoDB</li>
<li>Sentiment Analyzer scores posts (FinBERT)</li>
<li>Aggregator creates trends JSON</li>
<li>Frontend displays results via API</li>
</ul>
</div>
)
}