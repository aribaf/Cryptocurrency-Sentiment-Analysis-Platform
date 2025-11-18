import React from "react";
import { motion } from "framer-motion";
// Removed: import HeroIllustration from "./HeroIllustration";
// Removed: import HeroStats from "./HeroStats";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#101010]"> {/* Use a darker background for this section */}
      {/* Background shape/noise placeholder matching the inspiration */}
      <div className="absolute inset-0 opacity-10" aria-hidden>
        {/* Placeholder for noise/texture effect, can be a background image or CSS */}
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,...')] opacity-20" />
      </div>

      <div className="container mx-auto px-6 pt-28 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title Block */}
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="text-6xl md:text-8xl font-black leading-none tracking-tight text-white"
          >
            GET YOUR <span className="text-[#3c3c3c] inline-block -translate-y-1">MARKET</span>
            <br />
            SENTIMENT.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3, duration: 0.6 }} 
            className="mt-8 max-w-3xl mx-auto text-xl text-gray-300 font-medium"
          >
            <span className="text-cp-neon">Own your trend predictions.</span> No noise required.
          </motion.p>
          
          {/* CTA Buttons */}
          <div className="mt-12 flex justify-center gap-4">
            {/* Primary Button: Vibrant Orange/Red color from the inspiration site */}
            <a 
              href="/register" 
              className="px-10 py-4 text-lg font-bold rounded-md bg-[#ff522f] hover:bg-[#e64728] text-white transition-colors shadow-xl shadow-[#ff522f]/30"
            >
              Start Analyzing Today
            </a>
            {/* Secondary Button: Black/Dark contrast */}
            <a 
              href="#how" 
              className="px-10 py-4 text-lg font-bold rounded-md border border-gray-600 hover:border-white text-gray-200 transition-colors"
            >
              How It Works
            </a>
          </div>
          
          {/* The small user carousel is a good fit here to show activity */}
          <div className="mt-16">
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-4">Trusted by Market Watchers</h3>
            {/* The UserCarousel component will be rendered here via Home.jsx */}
            {/* We will update the UserCarousel style next */}
          </div>
          
        </div>

        {/* This is the spot where we can place a visual indicator/illustration/statistic */}
        {/* Using a simplified HeroStats layout for a compact footer-like element */}
        <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }} 
            className="mt-20 max-w-5xl mx-auto p-4 border-t border-b border-gray-800 flex justify-around items-center text-sm font-semibold"
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