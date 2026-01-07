// src/admin/AdminLayout.jsx
import { Outlet } from "react-router-dom";
import AdminTopBar from "./AdminTopBar";

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      {/* Admin-only top bar */}
      <AdminTopBar />

      {/* Admin pages render HERE */}
      <Outlet />
    </div>
  );
}
