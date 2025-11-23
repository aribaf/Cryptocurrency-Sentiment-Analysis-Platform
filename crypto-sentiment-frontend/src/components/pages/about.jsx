import React from 'react';
import { motion } from 'framer-motion';

export default function About() {
  return (
    // Set up the main container with the dark background from your home page
    <section className="bg-[#101010] min-h-screen text-gray-200 py-16 px-4 sm:px-6 lg:px-8">
      
      {/* Container for content, centered and max-width for readability */}
      <div className="max-w-6xl mx-auto">
        
        {/* === HEADER SECTION === */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          // Responsive Font Size: text-4xl on mobile, text-6xl on medium screens
          className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter"
        >
          About <span className="text-[#ff522f]">CryptoSent</span>
        </motion.h1>

        {/* Separator Line */}
        <div className="w-24 h-1 bg-[#d9ff2f] mb-12" />

        {/* === INTRODUCTION === */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          // Responsive Text Size: text-lg on mobile, text-xl on medium screens
          className="text-lg md:text-xl text-gray-400 mb-16 max-w-4xl"
        >
          CryptoSent is your advanced market sentiment dashboard, leveraging real-time data and cutting-edge machine learning to cut through the noise. We transform raw social data into actionable market predictions.
        </motion.p>

        {/* === HOW IT WORKS - VISUAL GRID LAYOUT === */}
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#d9ff2f] mb-12 uppercase tracking-wide">
          <span className="text-gray-500">How</span> It Works
        </h2>
        
        {/* Grid for responsiveness: 1 column on mobile, 2 columns on medium screens, 4 columns on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Item 1 */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="p-6 rounded-lg border-2 border-[#ff522f]/50 bg-black/30 shadow-2xl shadow-[#ff522f]/10"
          >
            <h3 className="text-2xl font-bold mb-2 text-[#ff522f]">1. Data Scrapers</h3>
            <p className="text-gray-400 text-sm">Scrapers gather posts from Twitter, Reddit, and News sources directly into MongoDB, ensuring fresh data.</p>
          </motion.div>

          {/* Item 2 */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="p-6 rounded-lg border-2 border-[#8b5cf6]/50 bg-black/30 shadow-2xl shadow-[#8b5cf6]/10"
          >
            <h3 className="text-2xl font-bold mb-2 text-[#8b5cf6]">2. Sentiment Analysis</h3>
            <p className="text-gray-400 text-sm">FinBERT scores each post, determining the bullish, bearish, or neutral sentiment with financial precision.</p>
          </motion.div>

          {/* Item 3 */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="p-6 rounded-lg border-2 border-[#d9ff2f]/50 bg-black/30 shadow-2xl shadow-[#d9ff2f]/10"
          >
            <h3 className="text-2xl font-bold mb-2 text-[#d9ff2f]">3. Trend Aggregator</h3>
            <p className="text-gray-400 text-sm">The aggregator processes scores into trends and signals, packaged as clean JSON data for speed.</p>
          </motion.div>

          {/* Item 4 */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="p-6 rounded-lg border-2 border-gray-600/50 bg-black/30 shadow-2xl shadow-gray-600/10"
          >
            <h3 className="text-2xl font-bold mb-2 text-gray-200">4. Frontend Display</h3>
            <p className="text-gray-400 text-sm">The React frontend consumes the API, presenting the sentiment and trends in a dynamic dashboard.</p>
          </motion.div>
          
        </div>

        {/* === CTA BLOCK (Matching the JOIN THE CYPHERPUNK REVOLUTION style) === */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-20 p-8 sm:p-12 bg-[#ff522f] text-black rounded-xl shadow-2xl shadow-[#ff522f]/50"
        >
          <h2 className="text-3xl sm:text-4xl font-black uppercase mb-4 tracking-tight">
            Join the Sentiment Edge.
          </h2>
          <p className="text-lg font-medium mb-6">
            Ready to integrate data-driven sentiment into your trading strategy?
          </p>
          <a 
            href="/register" 
            className="inline-block px-10 py-3 text-lg font-bold rounded-md bg-black text-[#d9ff2f] hover:bg-gray-800 transition-colors"
          >
            Start Analyzing Today &rarr;
          </a>
        </motion.div>

      </div>
    </section>
  );
}