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

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 lg:pt-28 pb-12 sm:pb-16 md:pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Logo above hero heading */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <img
              src={Logo}
              alt="Cryptosent logo"
              className="w-16 sm:w-20 md:w-24 lg:w-32 h-auto filter brightness-0 invert"
            />
          </div>

          {/* Main Title Block */}
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-tight md:leading-none tracking-tight text-white"
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
            className="mt-4 sm:mt-6 md:mt-8 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-gray-300 font-medium px-2 sm:px-4"
          >
            <span className="text-cp-neon">Own your trend predictions.</span>{" "}
            No noise required.
          </motion.p>

          {/* CTA Buttons */}
          <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2 sm:px-4">
            <a
              href="/register"
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold rounded-md bg-[#ff522f] hover:bg-[#e64728] text-white transition-colors shadow-xl shadow-[#ff522f]/30"
            >
              Start Analyzing Today
            </a>
            <a
              href="#how"
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg font-bold rounded-md border border-gray-600 hover:border-white text-gray-200 transition-colors"
            >
              How It Works
            </a>
          </div>

          <div className="mt-10 sm:mt-12 md:mt-16">
            <h3 className="text-xs sm:text-sm font-semibold uppercase text-gray-500 mb-4">
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
          className="mt-12 sm:mt-16 md:mt-20 max-w-5xl mx-auto p-3 sm:p-4 md:p-6 border-t border-b border-gray-800 flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-row justify-around items-center text-xs sm:text-sm font-semibold gap-2 sm:gap-3 md:gap-4"
        >
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="text-[#ff522f] text-lg sm:text-xl flex-shrink-0">•</span>
            <span>Social Sentiment Index: 74 (Bullish)</span>
          </div>
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="text-[#d9ff2f] text-lg sm:text-xl flex-shrink-0">•</span>
            <span>Top Signal: Whale Accumulation</span>
          </div>
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="text-cp-neon text-lg sm:text-xl flex-shrink-0">•</span>
            <span>Confidence Metric: 92%</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
