import React from 'react'

const getSentimentDetails = (item) => {
    // Attempt to determine sentiment and confidence
    let label = item.sentiment_label || 'Neutral';
    let confidence = item.confidence || item.sentiment_score || null;

    // Use strong colors that stand out on a white background (e.g., green-600, red-600)
    let colorClass = 'text-yellow-600'; 
    
    // Custom colors based on the target image (Bitcoin = Red, Ethereum = Blue)
    if (item.coin === 'Bitcoin') {
        colorClass = 'text-red-600'; // Darker red
    } else if (item.coin === 'Ethereum') {
        colorClass = 'text-blue-600'; // Darker blue
    } else if (label.toLowerCase().includes('positive')) {
        colorClass = 'text-green-600'; // Darker green
    } else if (label.toLowerCase().includes('negative')) {
        colorClass = 'text-red-600'; // Darker red
    }

    return { label, confidence, colorClass };
}

// Simple time difference function (unchanged)
const timeSince = (date) => {
    if (!date) return 'N/A';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}


export default function RecentList({items=[]}){
    return (
        // ⚠️ Light Mode Update: bg-white, rounded-xl, shadow-md, lighter border
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-800">Recent Sentiments</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {items.slice(0, 15).map(it => {
                    const { label, confidence, colorClass } = getSentimentDetails(it);
                    
                    // Format confidence score for display (unchanged)
                    let confidenceDisplay = confidence !== null ? 
                        (confidence > 1.0 || confidence < -1.0 ? Math.round(confidence * 10) / 10 : Math.round(confidence * 100) / 100)
                        : 'N/A';
                    
                    return (
                        // ⚠️ Light Mode Update: Lighter border-b color
                        <div key={it.tweet_id || it._id || Math.random()} className="p-2 border-b border-gray-200 last:border-b-0">
                            
                            {/* Header: Coin/Source and Time Ago */}
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center space-x-2">
                                    {/* Colored bullet point */}
                                    <span className={`h-2 w-2 rounded-full ${colorClass.replace('text', 'bg')}`}></span>
                                    {/* Coin/Source */}
                                    <span className={`text-sm font-medium ${colorClass}`}>{it.coin || it.source || 'N/A'}</span>
                                </div>
                                {/* Time Ago */}
                                {/* ⚠️ Light Mode Update: Darker text for better contrast */}
                                <span className="text-xs text-gray-500">{timeSince(it.created_at)}</span>
                            </div>

                            {/* Main Text */}
                            {/* ⚠️ Light Mode Update: Darker text for better contrast */}
                            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{it.text}</p>
                            
                            {/* Sentiment/Confidence Footer */}
                            {/* ⚠️ Light Mode Update: Darker text for the footer info */}
                            <div className="flex justify-between items-center text-xs mt-2 text-gray-500">
                                <div>
                                    {label} ({confidenceDisplay})
                                </div>
                                {/* ⚠️ Light Mode Update: Blue text for links */}
                                <a href={it.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-500">open</a>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}