import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function AdminTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-cp-neon text-black"
        : "text-gray-300 hover:text-white hover:bg-white/10"
    }`;

  return (
    <header className="w-full bg-cp-panel border-b border-white/10 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative">
      {/* Left: Title */}
      <div className="flex items-center justify-between w-full sm:w-auto">
        
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen((s) => !s)}
          className="sm:hidden ml-3 p-2 rounded bg-white/5 text-gray-200"
          aria-label="Toggle admin menu"
        >
          {menuOpen ? (
            <XMarkIcon className="w-5 h-5" />
          ) : (
            <Bars3Icon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Center: Navigation (visible on sm and up) */}
      <nav className="hidden sm:flex gap-2 overflow-x-auto">
        <NavLink to="/admin" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/sentiment" className={linkClass}>
          Sentiment
        </NavLink>
        <NavLink to="/admin/trends" className={linkClass}>
          Trends
        </NavLink>
        <NavLink to="/admin/exports" className={linkClass}>
          Exports
        </NavLink>
        <NavLink to="/admin/settings" className={linkClass}>
          Settings
        </NavLink>
      </nav>

      {/* Right: Optional status */}
      <div className="text-xs text-gray-400">Admin Mode</div>

      {/* Mobile: dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden mt-3 w-full bg-cp-panel border border-white/10 rounded-lg p-2 space-y-2">
          <NavLink to="/admin" end className={({ isActive }) => `${isActive ? 'bg-cp-neon text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'} block px-3 py-2 rounded` } onClick={() => setMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/sentiment" className={({ isActive }) => `${isActive ? 'bg-cp-neon text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'} block px-3 py-2 rounded` } onClick={() => setMenuOpen(false)}>
            Sentiment
          </NavLink>
          <NavLink to="/admin/trends" className={({ isActive }) => `${isActive ? 'bg-cp-neon text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'} block px-3 py-2 rounded` } onClick={() => setMenuOpen(false)}>
            Trends
          </NavLink>
          <NavLink to="/admin/exports" className={({ isActive }) => `${isActive ? 'bg-cp-neon text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'} block px-3 py-2 rounded` } onClick={() => setMenuOpen(false)}>
            Exports
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => `${isActive ? 'bg-cp-neon text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'} block px-3 py-2 rounded` } onClick={() => setMenuOpen(false)}>
            Settings
          </NavLink>
        </div>
      )}
    </header>
  );
}
