// src/App.jsx
import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

/* Layouts / common components */
import Sidebar from "./components/sidebar";
import TopBar from "./components/TopBar";
import AuthSuccess from "./components/pages/AuthSucces";

/* Public pages */
import Home from "./components/pages/Home";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import ForgotPassword from "./components/pages/ForgotPassword";
import About from "./components/pages/about";

/* Dashboard / private pages */
import Dashboard from "./components/pages/dashboard";
import SentimentAnalysis from "./components/pages/SentimentAnalysis";
import TrendPrediction from "./components/pages/TrendPrediction";
import TransactionsPage from "./components/pages/Transactions";
import Payments from "./components/pages/Payments";
import Account from "./components/pages/Account";
// trigger vercel redeploy

/* Other views */
import News from "./components/pages/news";
import Breakdown from "./components/pages/Breakdown";

/* Auth flow */
import VerifyOTP from "./components/VerifyOTP";

function AppRoutes() {
  const location = useLocation();

  // pages that should NOT show the sidebar (public pages)
  const PUBLIC_PATHS = [
    "/",
    "/login",
    "/register",
    "/about",
    "/forgot-password",
    "/auth/success",
    "/verify-otp",          // ✅ OTP page is public (no sidebar/topbar)
  ];

  // show dashboard layout for everything else
  const isDashboardLayout = !PUBLIC_PATHS.includes(
    location.pathname.toLowerCase()
  );

  const routesTree = (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/about" element={<About />} />
      <Route path="/auth/success" element={<AuthSuccess />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />

      {/* Dashboard / private routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis" element={<SentimentAnalysis />} />
      <Route path="/prediction" element={<TrendPrediction />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/account" element={<Account />} />

      {/* Other */}
      <Route path="/news" element={<News />} />
      <Route path="/breakdown/:source" element={<Breakdown />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  const fakeUser = {
    name: "Ariba", // later you can replace with real user name from auth
  };

  // Dashboard layout (sidebar + top bar)
  if (isDashboardLayout) {
    return (
      <div className="min-h-screen bg-cp-bg text-gray-200">
        <Sidebar />

        {/* App-level header (desktop & up) */}
        <TopBar user={fakeUser} />

        {/* Main content – padding top so it's not hidden under top bar */}
        <main className="pt-16 md:pt-20 md:ml-64 px-4 sm:px-6 lg:px-8 pb-6">
          {routesTree}
        </main>
      </div>
    );
  }

  // Public layout (no sidebar, no top bar – keep it clean for login/home/OTP)
  return (
    <div className="min-h-screen bg-cp-bg text-gray-200">
      <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">{routesTree}</main>
    </div>
  );
}

export default AppRoutes;
