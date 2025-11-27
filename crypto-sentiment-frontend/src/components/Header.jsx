// src/components/Header.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/WHITE.png";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    // Height remains h-16 for a polished look
    <header className="z-30 border-b border-gray-900 bg-cp-bg h-16">
      {/* REMOVED: max-w-7xl mx-auto 
        The content now spans the full browser width, 
        using only padding (px-4 sm:px-6 lg:px-8) for edge spacing.
      */}
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Top row - py-4 for vertical centering */}
        <div className="flex items-center justify-between py-4">
          {/* Logo + name */}
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo} alt="logo" className="w-8 h-8 object-contain" />
            <span className="text-cp-neon text-xl font-display tracking-[0.25em] uppercase">
              CRYPTOSENT
            </span>
          </Link>

          {/* Desktop nav - Increased gap and font weight medium */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <Link
              to="/dashboard"
              className="hover:text-cp-neon transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/analysis"
              className="hover:text-cp-neon transition-colors"
            >
              Sentiment Analysis
            </Link>
            <Link
              to="/about"
              className="hover:text-cp-neon transition-colors"
            >
              About
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 rounded-md bg-cp-orange text-white font-bold hover:bg-opacity-90 transition-all shadow-md shadow-cp-orange/30"
            >
              Get Started
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md border border-white/15 text-gray-200 hover:bg-cp-panel"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <span className="block w-4 space-y-1">
              <span
                className={`block h-0.5 bg-gray-200 transition-transform ${
                  open ? "translate-y-1 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-gray-200 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-gray-200 transition-transform ${
                  open ? "-translate-y-1 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        {/* Mobile nav (full-width under header) */}
        {open && (
          <nav className="md:hidden pb-3 flex flex-col gap-1 text-sm font-semibold text-gray-300">
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="px-2 py-2 rounded hover:bg-cp-panel hover:text-cp-neon transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/analysis"
              onClick={() => setOpen(false)}
              className="px-2 py-2 rounded hover:bg-cp-panel hover:text-cp-neon transition-colors"
            >
              Sentiment Analysis
            </Link>
            <Link
              to="/about"
              onClick={() => setOpen(false)}
              className="px-2 py-2 rounded hover:bg-cp-panel hover:text-cp-neon transition-colors"
            >
              About
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="mt-1 px-4 py-2 rounded-md bg-cp-orange text-white font-bold text-center hover:bg-opacity-90 transition-all shadow-md shadow-cp-orange/30"
            >
              Get Started
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
