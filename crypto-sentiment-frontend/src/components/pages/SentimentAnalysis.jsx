// src/pages/SentimentAnalysis.jsx
import React from 'react'

import SentimentCard from '../sentiment_card'
import TrendChart from '../trend_chart'

// Placeholder component for the Search/Filter block
const SearchFilter = () => (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <h4 className="text-lg font-semibold mb-4 text-gray-800">Search</h4>
        <p className="text-sm text-gray-500 mb-4">Search for specific cryptocurrencies</p>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cryptocurrency</label>
                <div className="flex space-x-2">
                    <input type="text" placeholder="Bitcoin, Ethereum, et" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Search</button>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option>Last 30 days</option>
                    <option>Last 7 days</option>
                    <option>Last 90 days</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option>All Sources</option>
                    <option>Reddit</option>
                    <option>Twitter</option>
                    <option>News</option>
                </select>
            </div>
            
            <button className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium mt-4">
                Apply Filters
            </button>
        </div>
    </div>
)

const PopularSearches = () => (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 mt-6">
        <h4 className="text-lg font-semibold mb-3 text-gray-800">Popular Searches</h4>
        <div className="flex flex-wrap gap-2">
            {['Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Dogecoin', 'Shiba Inu'].map(coin => (
                <span key={coin} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 cursor-pointer">
                    {coin}
                </span>
            ))}
        </div>
    </div>
)

const Heatmap = () => (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 h-96 mt-6">
        <h4 className="text-lg font-semibold text-gray-800">Sentiment Heatmap</h4>
        <p className="text-sm text-gray-500 mb-4">Visualize sentiment across different cryptocurrencies</p>
        <div className="flex items-center justify-center h-4/5 text-gray-400">
            Sentiment heatmap visualization will appear here
        </div>
    </div>
)


export default function SentimentAnalysis(){
    // Use dummy data for cards (can be replaced with API calls later)
    const dummyCards = [
        { title: "Reddit Sentiment", label: "Positive", score: 0.15, diff: "+15%" },
        { title: "Twitter Sentiment", label: "Neutral", score: -0.02, diff: "-2%" },
        { title: "News Sentiment", label: "Negative", score: -0.08, diff: "-8%" },
        { title: "Overall Sentiment", label: "Neutral", score: 0.05, diff: "+5%" },
    ]
    
    // Placeholder for trend data (use empty array for now)
    const trendData = []

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Sentiment Analysis</h1>
                <button className="text-sm px-3 py-1 bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                    Export Data
                </button>
            </div>

            {/* Sentiment Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {dummyCards.map(card => (
                    <SentimentCard 
                        key={card.title}
                        title={card.title} 
                        label={card.label + card.diff} // Combine label and diff
                        score={card.score}
                    />
                ))}
            </div>

            {/* Main Content: Chart (2/3) and Search/Filter (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 h-96">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Analysis</h4>
                        {/* Source Tabs */}
                        <div className="flex space-x-2 mb-4">
                            {['All Sources', 'Reddit', 'Twitter', 'News'].map(tab => (
                                <button key={tab} className={`px-4 py-1 text-sm rounded-full transition-colors ${tab === 'All Sources' ? 'bg-blue-100 text-blue-600 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        {/* The chart component is flexible enough to take any data */}
                        <TrendChart data={trendData} height={250} /> 
                    </div>
                </div>
                
                <div className="lg:col-span-1">
                    <SearchFilter />
                    <PopularSearches />
                </div>
            </div>

            {/* Heatmap Section (Full Width) */}
            <Heatmap />
        </div>
    )
}