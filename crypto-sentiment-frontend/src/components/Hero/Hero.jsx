// src/components/Hero.jsx
import React from "react";
import { motion } from "framer-motion";
import Logo from "../../assets/logo-white.svg";


export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#101010]">
      {/* Background shape/noise placeholder matching the inspiration */}
      <div className="absolute inset-0 opacity-10" aria-hidden>
        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,...')] opacity-20" />
      </div>

      <div className="container mx-auto px-6 pt-20 md:pt-28 pb-16 md:pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Logo above hero heading */}
           <div className="flex justify-center mb-8">
  <img
    src={Logo}
    alt="Cryptosent logo"
    className="w-24 h-24 md:w-32 md:h-32 filter brightness-0 invert"
  />
</div>



          {/* Main Title Block */}
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="text-5xl sm:text-6xl md:text-8xl font-black leading-tight md:leading-none tracking-tight text-white"
          >
            GET YOUR{" "}
            <span className="text-[#3c3c3c] inline-block -translate-y-1">
              MARKET
            </span>
            <br />
            SENTIMENT.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 md:mt-8 max-w-3xl mx-auto text-lg md:text-xl text-gray-300 font-medium px-4"
          >
            <span className="text-cp-neon">Own your trend predictions.</span>{" "}
            No noise required.
          </motion.p>

          {/* CTA Buttons */}
          <div className="mt-10 md:mt-12 flex flex-col sm:flex-row justify-center gap-4 px-4">
            <a
              href="/register"
              className="w-full sm:w-auto px-8 py-3 sm:px-10 sm:py-4 text-lg font-bold rounded-md bg-[#ff522f] hover:bg-[#e64728] text-white transition-colors shadow-xl shadow-[#ff522f]/30"
            >
              Start Analyzing Today
            </a>
            <a
              href="#how"
              className="w-full sm:w-auto px-8 py-3 sm:px-10 sm:py-4 text-lg font-bold rounded-md border border-gray-600 hover:border-white text-gray-200 transition-colors"
            >
              How It Works
            </a>
          </div>

          <div className="mt-12 md:mt-16">
            <h3 className="text-sm font-semibold uppercase text-gray-500 mb-4">
              Trusted by Market Watchers
            </h3>
            {/* UserCarousel goes here */}
          </div>
        </div>

        {/* Hero Stats Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 md:mt-20 max-w-5xl mx-auto p-4 border-t border-b border-gray-800 flex flex-col md:flex-row justify-around items-center text-sm font-semibold md:space-y-0 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[#ff522f] text-xl">•</span>
            <span>Social Sentiment Index (SSI): 74 (Bullish)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#d9ff2f] text-xl">•</span>
            <span>Top Signal: Whale Accumulation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cp-neon text-xl">•</span>
            <span>Confidence Metric: 92%</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
