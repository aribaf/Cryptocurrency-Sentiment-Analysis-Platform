// src/components/TopBar.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserCircleIcon } from "@heroicons/react/24/outline";

const PAGE_META = {
  "/dashboard": { section: "Home", page: "Dashboard" },
  "/analysis": { section: "Analytics", page: "Sentiment Analysis" },
  "/prediction": { section: "Analytics", page: "Trend Prediction" },
  "/transactions": { section: "Activity", page: "Transactions" },
  "/payments": { section: "Activity", page: "Payments" },
  "/account": { section: "Account", page: "Profile" },
  "/news": { section: "Analytics", page: "News Feed" },

  // Admin routes
  "/admin": { section: "Home", page: "Admin Panel" },
  "/admin/sentiment": { section: "Admin Panel", page: "Sentiment" },
  "/admin/trends": { section: "Admin Panel", page: "Trends" },
  "/admin/exports": { section: "Admin Panel", page: "Exports" },
  "/admin/settings": { section: "Admin Panel", page: "Settings" },
};

export default function TopBar({ user, loading, envLabel = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = location.pathname.toLowerCase();
  const meta = PAGE_META[pathname] || { section: "Home", page: "Overview" };

  const handleLogout = () => {
    // here you can also clear tokens/localStorage if you add auth later
    navigate("/login");
    setMenuOpen(false);
  };

  const handleAccount = () => {
    navigate("/account");
    setMenuOpen(false);
  };

  return (
    <header
      className="
        fixed top-0 left-0 right-0 md:left-64
        h-12 md:h-14 bg-cp-panel/95 border-b border-gray-900
        flex items-center justify-between
        px-3 sm:px-4 md:px-6 z-30
      "
    >
      {/* Breadcrumb - hide on small screens */}
      <div className="hidden sm:flex items-center text-xs md:text-sm gap-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-cp-neon hover:underline font-semibold"
        >
          Home
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-200 font-medium truncate">{meta.page}</span>
      </div>

      {/* Mobile: show page title only */}
      <div className="sm:hidden text-xs font-medium text-gray-200">{meta.page}</div>

      {/* Right side: env pill + avatar dropdown */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Environment label - hide on mobile */}
        <span className="hidden sm:inline px-2 md:px-3 py-1 rounded-full text-[10px] md:text-[11px] font-medium bg-black/40 border border-white/10 text-gray-200">
          {envLabel}
        </span>

        {/* Avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-1 md:gap-2 text-xs text-gray-200 hover:text-white"
          >
            {/* Avatar (first letter) */}
            <div className="w-7 md:w-8 h-7 md:h-8 rounded-full bg-cp-neon text-black flex items-center justify-center text-xs md:text-sm font-bold">
              {user?.username?.[0]?.toUpperCase() || "?"}
            </div>

            {/* Username - hide on mobile */}
            <span className="hidden md:inline text-xs md:text-sm">
              {loading ? "Loading…" : user?.username || "Guest"}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 md:w-44 bg-cp-panel border border-white/10 rounded-lg shadow-lg text-xs text-gray-200 z-40">
              <button
                onClick={handleAccount}
                className="w-full text-left px-3 py-2 hover:bg-cp-bg/80 rounded-t-lg text-xs md:text-sm"
              >
                Account settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 hover:bg-cp-bg/80 text-red-300 rounded-b-lg text-xs md:text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
