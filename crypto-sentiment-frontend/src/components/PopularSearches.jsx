// src/components/PopularSearches.jsx
import React from "react";

const defaultCoins = ["Bitcoin", "Ethereum", "Solana", "Cardano", "Dogecoin", "Shiba Inu"];

export default function PopularSearches({ coins = defaultCoins, onPick }) {
  return (
    <div className="bg-cp-panel/90 rounded-lg md:rounded-xl p-4 md:p-6 shadow-md border border-white/5 mt-4 md:mt-6">
      <h4 className="text-base md:text-lg font-display font-semibold mb-2 text-white">
        Popular Searches
      </h4>
      <p className="text-[10px] md:text-xs text-gray-400 mb-3 md:mb-4">
        Tap a coin to quickly filter sentiment and recent posts.
      </p>

      <div className="flex flex-wrap gap-2">
        {coins.map((coin, idx) => {
          // alternate accent colors a bit
          const accent =
            idx % 3 === 0
              ? "from-cp-neon to-cp-purple"
              : idx % 3 === 1
              ? "from-cp-purple to-cp-orange"
              : "from-cp-neon to-cp-orange";

          return (
            <button
              key={coin}
              type="button"
              onClick={() => onPick && onPick(coin)}
              className={`
                px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium
                bg-cp-bg/80 border border-white/10 text-gray-100
                hover:text-black
                hover:bg-gradient-to-r ${accent}
                transition
                shadow-sm hover:shadow-[0_0_14px_rgba(0,0,0,0.7)]
              `}
            >
              {coin}
            </button>
          );
        })}
      </div>
    </div>
  );
}
