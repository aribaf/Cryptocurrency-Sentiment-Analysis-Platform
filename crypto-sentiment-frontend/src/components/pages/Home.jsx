// src/pages/Home.jsx
import React from 'react'
import { Link } from 'react-router-dom'

const FeatureCard = ({ title, description, icon }) => (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div className="p-4 rounded-full bg-blue-100 text-blue-600 mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
    </div>
)

export default function Home() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header/Nav */}
            <header className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
                <h1 className="text-2xl font-bold text-gray-800">CryptoSent</h1>
                <nav className="space-x-4">
                    <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
                    <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Register</Link>
                </nav>
            </header>

            <main className="container mx-auto px-4 py-16">
                {/* Hero Section */}
                <section className="text-center py-20">
                    <h2 className="text-5xl font-extrabold mb-4 text-gray-800">
                        Cryptocurrency Sentiment Analysis Platform
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Real-time sentiment analysis and trend prediction for cryptocurrency markets
                    </p>
                    <div className="space-x-4">
                        <Link to="/register" className="px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors">
                            Get Started
                        </Link>
                        <button className="px-6 py-3 border border-gray-300 text-gray-700 text-lg font-medium rounded-lg hover:bg-gray-100 transition-colors">
                            Learn More
                        </button>
                    </div>
                </section>

                {/* Features Section */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-20">
                    <FeatureCard
                        title="Real-time Sentiment Analysis"
                        description="Analyze sentiment from social media, news, and blockchain data."
                        icon={<span role="img" aria-label="dollar">💰</span>}
                    />
                    <FeatureCard
                        title="Trend Prediction"
                        description="AI-powered market trend predictions with confidence scores."
                        icon={<span role="img" aria-label="up-arrow">📈</span>}
                    />
                    <FeatureCard
                        title="Transaction Tracking"
                        description="Monitor large transactions and wallet movements."
                        icon={<span role="img" aria-label="wallet">💳</span>}
                    />
                </section>
            </main>
        </div>
    )
}