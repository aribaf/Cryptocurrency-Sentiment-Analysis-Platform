// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/logo-white.svg";

export default function Footer() {
  return (
    <footer className="py-20 bg-cp-bg border-t border-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto px-6 text-center">
        
        {/* Top CTA Section - Highlighting with Neon */}
        <div className="mb-12">
          <h4 className="text-4xl font-display font-extrabold text-cp-neon">
            SECURE YOUR EDGE IN THE MARKET
          </h4>
          <p className="text-gray-400 mt-3 text-lg">
            Subscribe today and stop guessing the next trend.
          </p>
        </div>

        {/* Input/Reserve Section */}
        <div className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              placeholder="Enter your email to join the waitlist" 
              className="flex-1 px-4 py-3 rounded-md bg-cp-panel border border-gray-700 text-white placeholder-gray-500 
                        focus:border-cp-purple focus:ring-1 focus:ring-cp-purple transition-all outline-none" 
              type="email"
            />
            {/* Primary button using the strong accent color */}
            <button 
              // Use custom cp-orange from tailwind config
              className="px-6 py-3 bg-cp-orange text-white rounded-md font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-cp-orange/20"
            >
              Subscribe
            </button>
          </div>
        </div>

        {/* Legal/Copyright Section - Subtle text and neon link hovers */}
        <div className="mt-20 text-sm text-gray-500 flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-3">
            {/* Keep logo subtle */}
            <img src={Logo} alt="logo" className="w-8 h-8 opacity-40" />
            <div>© {new Date().getFullYear()} CryptoSent — All rights reserved.</div>
          </div>
          <div className="flex gap-6">
              {/* Link hover in the neon accent color */}
              <Link to="/terms" className="hover:text-cp-neon transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-cp-neon transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}