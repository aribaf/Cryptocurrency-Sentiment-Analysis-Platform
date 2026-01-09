import React, { useState } from "react";

export default function FAQ({ items }) {
  const [openIndex, setOpenIndex] = useState(null);
  
  // Updated list with crypto-sentiment relevant questions
  const list = items || [
    { q: "What is the Sentiment Confidence Score?", a: "It's a probability metric (0-100%) indicating how likely the predicted trend is to occur based on a convergence of social, news, and on-chain factors." },
    { q: "How often is the data updated?", a: "Sentiment and on-chain data are updated in real-time or near real-time, typically within seconds to minutes of new data points being observed." },
    { q: "Can I integrate signals into my own trading bot?", a: "Yes, we offer a dedicated API for paid subscribers to access our raw sentiment data and prediction signals for integration into custom trading solutions." },
    { q: "Is this financial advice?", a: "No. CryptoSent provides data and predictions for informational purposes only. It is not financial or trading advice, and you should always conduct your own research." }
  ];

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-black text-white"> {/* Dark background */}
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        
        {/* Title */}
        <h3 className="text-3xl sm:text-4xl md:text-5xl font-black mb-8 sm:mb-10 text-center">
          FREQUENTLY ASKED QUESTIONS
        </h3>
        
        <div className="space-y-3 sm:space-y-4">
          {list.map((it, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-gray-800 shadow-xl">
              
              {/* Accordion Button (Black with Neon Highlight on hover) */}
              <button 
                className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex items-center justify-between bg-black text-white hover:bg-[#1a1a1a] transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-semibold text-base sm:text-lg">{it.q}</span>
                <span className="text-[#ff522f] text-xl sm:text-2xl font-light ml-3 sm:ml-4 flex-shrink-0">
                  {openIndex === i ? "—" : "+"}
                </span>
              </button>
              
              {/* Accordion Content (Visible when open) */}
              <div 
                className={`px-4 sm:px-6 transition-all duration-300 ease-in-out bg-[#101010] ${
                  openIndex === i 
                    ? "max-h-96 py-4 sm:py-5 opacity-100" 
                    : "max-h-0 py-0 opacity-0"
                }`}
                style={{ overflow: 'hidden' }} // Ensure smooth collapse
              >
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                  {it.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}