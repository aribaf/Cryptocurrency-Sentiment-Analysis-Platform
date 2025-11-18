import React from "react";

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-black border-t border-gray-800">
      <div className="container mx-auto px-6">
        
        {/* Title Block */}
        <h2 className="text-4xl font-black text-white mb-2">HOW IT WORKS</h2>
        <p className="text-lg text-gray-400 max-w-3xl mb-12">
          From raw data to actionable signal in three simple steps. Our engine does the heavy lifting, you reap the benefits.
        </p>

        {/* The Steps/Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Step 1: Data Ingestion (Dark Panel with Neon Accent) */}
          <div className="p-8 rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-lg transition-transform hover:scale-[1.02]">
            <div className="text-3xl font-black mb-4 text-[#ff522f]">1. COLLECT & FILTER</div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Source Data Lake</h3>
            <p className="text-gray-400 text-sm">
              We ingest millions of data points from social media, news outlets, and blockchain explorers, then aggressively filter for noise and bots.
            </p>
          </div>

          {/* Step 2: Analysis & Prediction (Dark Panel with Neon Accent) */}
          <div className="p-8 rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-lg transition-transform hover:scale-[1.02]">
            <div className="text-3xl font-black mb-4 text-[#d9ff2f]">2. PROCESS & PREDICT</div>
            <h3 className="text-xl font-bold text-white mb-2">Proprietary Sentiment AI</h3>
            <p className="text-gray-400 text-sm">
              Our advanced ML models analyze sentiment patterns, detect on-chain divergences, and generate high-probability trend predictions.
            </p>
          </div>

          {/* Step 3: Actionable Signal (Dark Panel with Neon Accent) */}
          <div className="p-8 rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-lg transition-transform hover:scale-[1.02]">
            <div className="text-3xl font-black mb-4 text-[#8b5cf6]">3. SIGNAL & ALERT</div>
            <h3 className="text-xl font-bold text-white mb-2">Actionable Confidence</h3>
            <p className="text-gray-400 text-sm">
              Receive clear, prioritized signals with a calculated confidence score, delivered instantly to your dashboard or via API alerts.
            </p>
          </div>
        </div>
        
        {/* Call to Action Button below How It Works */}
        <div className="mt-12 text-center">
            <a 
              href="/dashboard-preview" 
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold rounded-md bg-white text-black hover:bg-gray-200 transition-colors"
            >
              See Live Dashboard Demo
            </a>
        </div>

      </div>
    </section>
  );
}