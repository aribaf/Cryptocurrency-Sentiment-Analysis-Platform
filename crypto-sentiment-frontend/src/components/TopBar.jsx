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
};

export default function TopBar({ user, envLabel = "Live data" }) {
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
        fixed top-0 left-64 right-0
        h-14 bg-cp-panel/95 border-b border-gray-900
        flex items-center justify-between
        px-6 z-30
      "
    >
      {/* Breadcrumb */}
      <div className="flex items-center text-sm gap-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-cp-neon hover:underline font-semibold"
        >
          Home
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-200 font-medium">{meta.page}</span>
      </div>

      {/* Right side: env pill + avatar dropdown */}
      <div className="flex items-center gap-4">
        {/* Environment label */}
        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-black/40 border border-white/10 text-gray-200">
          {envLabel}
        </span>

        {/* Avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 text-xs text-gray-200 hover:text-white"
          >
            <UserCircleIcon className="w-8 h-8 text-cp-neon" />
            <span className="hidden md:inline">
              {user?.name || "Account"}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-cp-panel border border-white/10 rounded-lg shadow-lg text-xs text-gray-200 z-40">
              <button
                onClick={handleAccount}
                className="w-full text-left px-3 py-2 hover:bg-cp-bg/80 rounded-t-lg"
              >
                Account settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 hover:bg-cp-bg/80 text-red-300 rounded-b-lg"
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
