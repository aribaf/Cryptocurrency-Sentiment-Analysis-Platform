import React from "react";

export default function CTAJoin() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-[#ff522f]"> {/* Vibrant Orange/Red Background */}
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto text-black">
          
          {/* Subtitle */}
          <div className="text-xs sm:text-sm font-extrabold uppercase text-black/80 mb-2 tracking-widest">
            UNLOCK YOUR EDGE.
          </div>
          
          {/* Main Title */}
          <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 sm:mb-8">
            JOIN THE <span className="text-white">SENTIMENT REVOLUTION</span>
          </h3>
          
          {/* CTA Input and Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 max-w-lg">
            {/* Input is now dark/black to contrast with the orange background */}
            <input 
              aria-label="reserve" 
              placeholder="Your email address" 
              className="flex-1 w-full px-4 sm:px-5 py-3 sm:py-4 rounded-lg border-2 border-black/10 text-base sm:text-lg shadow-inner bg-black text-white placeholder-gray-500" 
            />
            {/* Button is black/dark for maximum contrast */}
            <button 
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-black text-white font-black text-base sm:text-lg hover:bg-gray-800 transition-colors shadow-lg whitespace-nowrap"
            >
              Get Instant Access
            </button>
          </div>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-black/70">
            No credit card required. Start your 7-day free trial.
          </p>
          
        </div>
      </div>
    </section>
  );
}