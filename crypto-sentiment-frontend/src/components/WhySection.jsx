import React from "react";

export default function WhySection() {
  return (
    <section className="py-20 bg-black text-white"> {/* Dark background */}
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Left Column: Title and Main Description */}
          <div className="lg:col-span-1">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
              SIGNAL QUALITY
            </h3>
            <h2 className="text-5xl font-black leading-tight">
              WHY <span className="text-[#d9ff2f]">CRYPTO</span>SENT SIGNALS?
            </h2>
            <p className="mt-6 text-lg text-gray-400">
              We focus on synthesizing raw social, news, and on-chain data into actionable, easy-to-read confidence metrics, cutting through the market noise.
            </p>
          </div>
          
          {/* Right Column: Key Features in Colored Blocks */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Box 1: Neon Orange/Red */}
            <div className="p-8 rounded-xl bg-[#ff522f] text-black shadow-xl">
              <div className="text-3xl font-black mb-2">UNBIASED DATA</div>
              <p className="text-sm font-medium">
                Raw, unfiltered sentiment from over 100 sources. Our algorithms remove bot activity and noise.
              </p>
            </div>
            
            {/* Box 2: Neon Yellow/Green */}
            <div className="p-8 rounded-xl bg-[#d9ff2f] text-black shadow-xl">
              <div className="text-3xl font-black mb-2">ON-CHAIN SYNC</div>
              <p className="text-sm font-medium">
                Correlate social signals with large-scale whale movements, exchange flows, and dormancy.
              </p>
            </div>

            {/* Box 3: Dark Purple/Panel */}
            <div className="p-8 rounded-xl bg-gray-900 border border-gray-700 text-white shadow-xl">
              <div className="text-3xl font-black mb-2 text-[#8b5cf6]">TREND PREDICTIONS</div>
              <p className="text-sm font-medium text-gray-400">
                Proprietary machine learning models provide probability-based trend outcomes 24-48 hours ahead.
              </p>
            </div>
            
            {/* Box 4: Blue/Cyan Accent */}
            <div className="p-8 rounded-xl bg-gray-900 border border-gray-700 text-white shadow-xl">
              <div className="text-3xl font-black mb-2 text-[#00f7ff]">CONFIDENCE METRICS</div>
              <p className="text-sm font-medium text-gray-400">
                Every signal comes with a verifiable confidence score, giving you certainty in uncertain markets.
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
}