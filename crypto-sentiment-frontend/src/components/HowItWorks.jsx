import React from "react";
import { useNavigate } from "react-router-dom";

export default function HowItWorks() {
  const navigate = useNavigate();
  return (
    <section id="how" className="py-16 sm:py-20 md:py-24 bg-black border-t border-gray-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Title Block */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2">HOW IT WORKS</h2>
        <p className="text-base sm:text-lg text-gray-400 max-w-3xl mb-8 sm:mb-12">
          From raw data to actionable signal in three simple steps. Our engine does the heavy lifting, you reap the benefits.
        </p>

        {/* The Steps/Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          
          {/* Step 1: Data Ingestion (Dark Panel with Neon Accent) */}
          <div className="p-6 sm:p-8 rounded-lg md:rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-lg transition-transform hover:scale-[1.02]">
            <div className="text-2xl sm:text-3xl font-black mb-4 text-[#ff522f]">1. COLLECT & FILTER</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Multi-Source Data Lake</h3>
            <p className="text-sm text-gray-400">
              We ingest millions of data points from social media, news outlets, and blockchain explorers, then aggressively filter for noise and bots.
            </p>
          </div>

          {/* Step 2: Analysis & Prediction (Dark Panel with Neon Accent) */}
          <div className="p-6 sm:p-8 rounded-lg md:rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-lg transition-transform hover:scale-[1.02]">
            <div className="text-2xl sm:text-3xl font-black mb-4 text-[#d9ff2f]">2. PROCESS & PREDICT</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Proprietary Sentiment AI</h3>
            <p className="text-sm text-gray-400">
              Our advanced ML models analyze sentiment patterns, detect on-chain divergences, and generate high-probability trend predictions.
            </p>
          </div>

          {/* Step 3: Actionable Signal (Dark Panel with Neon Accent) */}
          <div className="p-6 sm:p-8 rounded-lg md:rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-lg transition-transform hover:scale-[1.02]">
            <div className="text-2xl sm:text-3xl font-black mb-4 text-[#8b5cf6]">3. SIGNAL & ALERT</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Actionable Confidence</h3>
            <p className="text-sm text-gray-400">
              Receive clear, prioritized signals with a calculated confidence score, delivered instantly to your dashboard or via API alerts.
            </p>
          </div>
        </div>
        
        {/* Call to Action Button below How It Works */}
        <div className="mt-10 sm:mt-12 md:mt-16 text-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-lg font-bold rounded-md bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer"
            >
              See Live Dashboard Demo
            </button>
        </div>

      </div>
    </section>
  );
}