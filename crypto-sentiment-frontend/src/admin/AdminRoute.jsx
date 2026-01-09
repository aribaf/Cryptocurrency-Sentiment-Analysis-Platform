import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Guard admin-only routes
export default function AdminRoute({ children }) {
  const token = localStorage.getItem("access_token");
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return children;
}
