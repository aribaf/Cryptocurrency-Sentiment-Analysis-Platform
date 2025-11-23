import React from "react";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#101010]">
      {/* Background shape/noise placeholder matching the inspiration */}
      <div className="absolute inset-0 opacity-10" aria-hidden>
        {/* Placeholder for noise/texture effect, can be a background image or CSS */}
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,...')] opacity-20" />
      </div>

      {/* Adjust vertical padding for smaller screens */}
      <div className="container mx-auto px-6 **pt-20 md:pt-28 pb-16 md:pb-20** relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title Block - Adjust font size for responsiveness */}
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
            // Adjusted: text-6xl for mobile, md:text-8xl for medium screens and up
            className="**text-5xl sm:text-6xl md:text-8xl** font-black leading-tight **md:leading-none** tracking-tight text-white"
          >
            GET YOUR <span className="text-[#3c3c3c] inline-block -translate-y-1">MARKET</span>
            <br />
            SENTIMENT.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3, duration: 0.6 }} 
            // Adjusted: text-lg for mobile, text-xl for larger screens
            className="mt-6 md:mt-8 max-w-3xl mx-auto **text-lg md:text-xl** text-gray-300 font-medium px-4"
          >
            <span className="text-cp-neon">Own your trend predictions.</span> No noise required.
          </motion.p>
          
          {/* CTA Buttons - Ensure stack on mobile and use padding consistently */}
          <div className="mt-10 md:mt-12 flex **flex-col sm:flex-row** justify-center gap-4 **px-4**">
            {/* Primary Button: Increased width/full-width on mobile */}
            <a 
              href="/register" 
              // Added w-full sm:w-auto to handle button width
              className="**w-full sm:w-auto** px-8 py-3 **sm:px-10 sm:py-4** text-lg font-bold rounded-md bg-[#ff522f] hover:bg-[#e64728] text-white transition-colors shadow-xl shadow-[#ff522f]/30"
            >
              Start Analyzing Today
            </a>
            {/* Secondary Button: Increased width/full-width on mobile */}
            <a 
              href="#how" 
              // Added w-full sm:w-auto to handle button width
              className="**w-full sm:w-auto** px-8 py-3 **sm:px-10 sm:py-4** text-lg font-bold rounded-md border border-gray-600 hover:border-white text-gray-200 transition-colors"
            >
              How It Works
            </a>
          </div>
          
          {/* Market Watchers Text */}
          <div className="mt-12 md:mt-16">
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-4">Trusted by Market Watchers</h3>
            {/* The UserCarousel component will be rendered here via Home.jsx */}
          </div>
          
        </div>

        {/* Hero Stats Section - Key for responsiveness in this section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }} 
          // Adjusted: Changed from flex justify-around to flex-col on mobile, back to flex-row/grid for medium screens
          // Added space-y-3 for vertical spacing on mobile
          className="mt-16 md:mt-20 max-w-5xl mx-auto p-4 border-t border-b border-gray-800 flex **flex-col md:flex-row** justify-around items-center text-sm font-semibold **md:space-y-0 space-y-3**"
        >
            <div className="flex items-center gap-2">
                <span className="text-[#ff522f] text-xl">•</span> 
                <span>**Social Sentiment Index (SSI)**: 74 (Bullish)</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[#d9ff2f] text-xl">•</span> 
                <span>**Top Signal**: Whale Accumulation</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-cp-neon text-xl">•</span> 
                <span>**Confidence Metric**: 92%</span>
            </div>
        </motion.div>
      </div>
    </section>
  );
}