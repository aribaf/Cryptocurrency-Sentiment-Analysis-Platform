import { NavLink } from "react-router-dom";

export default function AdminTopBar() {
  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-cp-neon text-black"
        : "text-gray-300 hover:text-white hover:bg-white/10"
    }`;

  return (
    <header className="w-full bg-cp-panel border-b border-white/10 px-6 py-3 flex items-center justify-between">
      {/* Left: Title */}
      <h2 className="text-lg font-bold text-cp-neon">
        Admin Panel
      </h2>

      {/* Center: Navigation */}
      <nav className="flex gap-2">
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
      <div className="text-xs text-gray-400">
        Admin Mode
      </div>
    </header>
  );
}
