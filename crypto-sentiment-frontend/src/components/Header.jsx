// src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/logo-white.svg";

export default function Header() {
  return (
    <header className="relative z-30 border-b border-gray-900 bg-cp-bg">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between max-w-7xl">
        
        {/* Logo and Site Name */}
        <div className="flex items-center gap-3">
          <img src={Logo} alt="logo" className="w-10 h-10 object-contain" />
          {/* Accent the site name with the Neon color */}
          <div className="text-cp-neon font-white text-xl tracking-widest uppercase font-display">
                CRYPTOSENT
            </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-8 text-sm font-semibold text-gray-400">
          {/* Update hover color to the neon accent */}
          <Link to="/features" className="hover:text-cp-neon transition-colors">Features</Link>
          <Link to="/transactions" className="hover:text-cp-neon transition-colors">Transactions</Link>
          <Link to="/about" className="hover:text-cp-neon transition-colors">About</Link>

          {/* Main CTA button using the vibrant orange accent color */}
          <Link 
            to="/register" 
            // Use custom cp-orange from tailwind config
            className="px-5 py-2 rounded-md bg-cp-orange text-white font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-cp-orange/20"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}