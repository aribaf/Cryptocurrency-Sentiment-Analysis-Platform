import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

/* Layouts */
import Sidebar from "./components/sidebar";
import TopBar from "./components/TopBar";

/* Pages */
import Home from "./components/pages/Home";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import ForgotPassword from "./components/pages/ForgotPassword";
import About from "./components/pages/about";
import Dashboard from "./components/pages/dashboard";
import SentimentAnalysis from "./components/pages/SentimentAnalysis";
import TrendPrediction from "./components/pages/TrendPrediction";
import TransactionsPage from "./components/pages/Transactions";
import Payments from "./components/pages/Payments";
import Account from "./components/pages/Account";
import News from "./components/pages/news";
import Breakdown from "./components/pages/Breakdown";
import VerifyOTP from "./components/VerifyOTP";
import AuthSuccess from "./components/pages/AuthSucces";

/* Admin */
import AdminRoute from "./admin/AdminRoute";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import AdminSentiment from "./admin/AdminSentiment";
import AdminModelAccuracy from "./admin/AdminModelAccuracy";

export default function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();

  const PUBLIC_PATHS = [
    "/",
    "/login",
    "/register",
    "/about",
    "/forgot-password",
    "/auth/success",
    "/verify-otp",
  ];

  const isDashboardLayout =
    !PUBLIC_PATHS.includes(location.pathname.toLowerCase());

  const routesTree = (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/about" element={<About />} />
      <Route path="/auth/success" element={<AuthSuccess />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />

      {/* User */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis" element={<SentimentAnalysis />} />
      <Route path="/prediction" element={<TrendPrediction />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/account" element={<Account />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="sentiment" element={<AdminSentiment />} />
        <Route path="trends" element={<AdminModelAccuracy />} />
      </Route>

      {/* Other */}
      <Route path="/news" element={<News />} />
      <Route path="/breakdown/:source" element={<Breakdown />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  if (isDashboardLayout) {
    return (
      <div className="min-h-screen bg-cp-bg text-gray-200">
        <Sidebar />
        <TopBar user={user} loading={loading} />
        <main className="pt-16 md:pt-20 md:ml-64 px-4 sm:px-6 lg:px-8 pb-6">
          {routesTree}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cp-bg text-gray-200">
      <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {routesTree}
      </main>
    </div>
  );
}
