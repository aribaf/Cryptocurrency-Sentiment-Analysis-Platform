import React from "react";

export default function UserCarousel() {
  const users = [
    { name: "BTC_Trader", quote: "Sentiment shift alerted me early." },
    { name: "DeFi_Maxi", quote: "Confidence metrics are spot on." },
    { name: "HODL_Queen", quote: "Easy to digest signals." },
    { name: "Whale_Alert", quote: "Tracking on-chain data beautifully." },
  ];
  
  // A simple function to duplicate the list for infinite scroll feel
  const carouselItems = [...users, ...users]; 
  
  return (
    <section className="py-6 overflow-hidden">
      <div className="container mx-auto px-6">
        {/* We use a continuously scrolling animation (requires custom CSS/Tailwind animation) */}
        <div className="flex gap-4 py-2 animate-scroll-slow"> 
          {carouselItems.map((item, i) => (
            <div 
              key={i} 
              // Changed fixed style={{ minWidth: '280px' }} to the responsive Tailwind class min-w-[280px]
              // min-w-72 is a good alternative for 288px if you prefer built-in utility
              className="flex items-center gap-3 bg-black/80 border border-gray-800 px-4 py-3 rounded-full flex-shrink-0 min-w-[280px] sm:min-w-80 md:min-w-96"
            >
              <div className="w-10 h-10 bg-[#ff522f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                {item.name[0]}
              </div>
              <div className="text-sm text-gray-300">
                <span className="text-white font-semibold mr-1">@{item.name}</span>
                {item.quote}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}