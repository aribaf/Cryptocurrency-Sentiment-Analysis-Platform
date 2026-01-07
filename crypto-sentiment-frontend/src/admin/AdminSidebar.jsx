import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded text-sm ${
      isActive
        ? "bg-cp-neon text-black"
        : "text-gray-300 hover:bg-white/10"
    }`;

  return (
    <aside className="w-64 bg-cp-panel border-r border-white/10 p-4">
      <h2 className="text-lg font-bold mb-6 text-cp-neon">
        Admin Panel
      </h2>

      <nav className="space-y-2">
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
    </aside>
  );
}
